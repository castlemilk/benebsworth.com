/**
 * The `crypto-hash-race` execution driver, as a Python source string.
 *
 * It runs INSIDE the code-runtime subprocess (see `code-runtime.ts` for the
 * budget and the honest isolation scope). It imports nothing outside the
 * standard library, reads the model's block(s) from `subject_*.py` beside it,
 * and prints one JSON object after a sentinel line.
 *
 * ── WHERE THE CHECKS COME FROM ─────────────────────────────────────────────
 *
 * The task prompt is the whole contract, verbatim:
 *
 *   "Write a Python module that provides constant-time string comparison,
 *    PBKDF2-based password hashing with a random salt, and a verify function.
 *    Include unit tests."
 *
 * Four clauses, four executed checks (plus "it imports at all"). NOTHING here
 * asserts a value the prompt does not imply: there are no invented test
 * vectors, no required function names, no required storage format — the prompt
 * specifies none of those, so the driver DISCOVERS the module's functions by
 * introspection and asserts only the behaviour the prompt asked for:
 *
 *   module-executes        the module imports without raising
 *   constant-time-compare  equal inputs compare true, unequal compare false
 *   salted-hash-random     hashing the same password twice differs (a random
 *                          salt is the only way that happens)
 *   verify-round-trip      verify(correct) is true and verify(wrong) is false
 *   unit-tests-pass        the included unittest TestCases actually pass
 *
 * Discovery is deliberately generous (top-level functions, plus static/class/
 * instance methods of top-level classes, matched on name shape and arity, with
 * both argument orders tried for verify) because the prompt fixes no API. A
 * check that cannot find its function reports `not-found`, which reads in the
 * breakdown as "the module does not appear to provide this", not as a harness
 * bug.
 */
export const CRYPTO_HASH_RACE_DRIVER = String.raw`
import contextlib
import glob
import importlib.abc
import importlib.machinery
import inspect
import io
import json
import sys
import traceback
import types
import unittest

SENTINEL = "<<<BENCH_RESULT>>>"

CHECKS = []


def add(name, passed, points, max_points, detail=None):
    CHECKS.append(
        {
            "name": name,
            "passed": bool(passed),
            "points": points if passed else 0,
            "maxPoints": max_points,
            "detail": detail,
        }
    )


def emit():
    print(SENTINEL)
    print(json.dumps({"checks": CHECKS}))
    sys.stdout.flush()


def deny_network():
    """Best effort only — CPython has no permission model (see code-runtime.ts)."""
    try:
        import socket

        def denied(*args, **kwargs):
            raise OSError("network access is denied by the benchmark code-runtime")

        socket.socket = denied
        socket.create_connection = denied
        socket.getaddrinfo = denied
    except Exception:
        pass


def short(err):
    return "{}: {}".format(type(err).__name__, err)[:400]


def positional_arity(fn):
    try:
        params = inspect.signature(fn).parameters.values()
    except (TypeError, ValueError):
        return None
    required = 0
    optional = 0
    for p in params:
        if p.kind in (p.VAR_POSITIONAL, p.VAR_KEYWORD):
            continue
        if p.kind == p.KEYWORD_ONLY:
            continue
        if p.default is p.empty:
            required += 1
        else:
            optional += 1
    return (required, required + optional)


def accepts(fn, n):
    arity = positional_arity(fn)
    if arity is None:
        return True
    return arity[0] <= n <= arity[1]


def callables_in(namespace):
    """Top-level functions, plus methods reachable on top-level classes."""
    found = []
    for name, obj in list(namespace.items()):
        if name.startswith("_"):
            continue
        if inspect.isfunction(obj) or inspect.isbuiltin(obj):
            found.append((name, obj))
        elif inspect.isclass(obj):
            if issubclass(obj, unittest.TestCase) or issubclass(obj, BaseException):
                continue
            instance = None
            try:
                instance = obj()
            except Exception:
                instance = None
            for attr, member in list(vars(obj).items()):
                if attr.startswith("_"):
                    continue
                qualified = "{}.{}".format(name, attr)
                if isinstance(member, staticmethod):
                    found.append((qualified, member.__func__))
                elif isinstance(member, classmethod):
                    found.append((qualified, getattr(obj, attr)))
                elif inspect.isfunction(member) and instance is not None:
                    found.append((qualified, getattr(instance, attr)))
    return found


def pick(candidates, want, avoid, arity):
    """Best name-shaped candidate with a workable arity; most specific first."""
    scored = []
    for name, fn in candidates:
        lowered = name.lower().split(".")[-1]
        if any(bad in lowered for bad in avoid):
            continue
        hits = [i for i, token in enumerate(want) if token in lowered]
        if not hits:
            continue
        if arity is not None and not accepts(fn, arity):
            continue
        scored.append((min(hits), len(lowered), name, fn))
    scored.sort()
    return [(name, fn) for _, _, name, fn in scored]


PASSWORD = "correct horse battery staple"
WRONG = "correct horse battery stapl3"

deny_network()

# --- load the model's block(s) ------------------------------------------------
#
# A model may answer with ONE module, or with a module plus a separate test file
# (the codex family emits two <script type="text/plain"> blocks, the second
# doing 'import secure_passwords'). The harness cannot tell which block is the
# module, so the driver decides by EXECUTING each and keeping the one that
# actually provides the functions the prompt asked for.
#
# A LAST-RESORT meta_path finder resolves any otherwise-unresolvable top-level
# import to the module currently being executed. Appended, never prepended, so
# the standard library always wins. This is what makes a single block containing
# both the module and its 'import secure_utils' test file work — the import
# lands on the partially-built module itself, which is exactly what the model
# meant. The names it caught are reported in the module-executes detail rather
# than swallowed.

ALIASED = []
ALIAS_TARGET = [None]


class SubjectLoader(importlib.abc.Loader):
    def create_module(self, spec):
        return ALIAS_TARGET[0]

    def exec_module(self, module):
        return None


class SubjectFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if path is not None or "." in fullname or ALIAS_TARGET[0] is None:
            return None
        ALIASED.append(fullname)
        return importlib.machinery.ModuleSpec(fullname, SubjectLoader())


sys.meta_path.append(SubjectFinder())

quiet = io.StringIO()
BLOCK_PATHS = sorted(glob.glob("subject_*.py"))


def load_block(path):
    """Execute one block into a fresh module. Returns (module, error, aliased)."""
    name = path[:-3]
    module = types.ModuleType(name)
    module.__file__ = path
    before = len(ALIASED)
    previous = ALIAS_TARGET[0]
    ALIAS_TARGET[0] = module
    sys.modules[name] = module
    try:
        with open(path, "r", encoding="utf-8") as handle:
            source = handle.read()
        with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
            exec(compile(source, path, "exec"), module.__dict__)
        return module, None, ALIASED[before:]
    except BaseException as err:
        detail = short(err)
        tb = traceback.extract_tb(sys.exc_info()[2])
        for frame in tb:
            if frame.filename == path:
                detail = "{} at line {}".format(detail, frame.lineno)
        return None, detail, ALIASED[before:]
    finally:
        ALIAS_TARGET[0] = previous


def provision(module):
    """How many of the prompt's three functions this block appears to provide."""
    found = callables_in(vars(module))
    score = 0
    for want, avoid, arity in (
        (["constant_time", "compare", "equal"], ["verify", "hash"], 2),
        (["hash", "derive"], ["verify", "compare"], 1),
        (["verify", "check"], [], 2),
    ):
        if pick(found, want=want, avoid=avoid, arity=arity):
            score += 1
    return score


if not BLOCK_PATHS:
    add("module-executes", False, 0, 20, "extraction-failed: no program was written for execution")
    for name, points in (
        ("constant-time-compare", 20),
        ("salted-hash-random", 20),
        ("verify-round-trip", 25),
        ("unit-tests-pass", 15),
    ):
        add(name, False, 0, points, "extraction-failed: nothing to execute")
    emit()
    sys.exit(0)

LOADED = [(path,) + load_block(path) for path in BLOCK_PATHS]
OK = [entry for entry in LOADED if entry[1] is not None]

if not OK:
    # Every block failed; the FIRST is the one the extractor ranked highest, so
    # its error is the one that explains the artifact.
    path, _module, err, _aliased = LOADED[0]
    add("module-executes", False, 0, 20, "runtime-error: {}".format(err))
    for name, points in (
        ("constant-time-compare", 20),
        ("salted-hash-random", 20),
        ("verify-round-trip", 25),
        ("unit-tests-pass", 15),
    ):
        add(name, False, 0, points, "runtime-error: the module did not import, so nothing could be exercised")
    emit()
    sys.exit(0)

OK.sort(key=lambda entry: -provision(entry[1]))
SUBJECT_PATH, SUBJECT_MODULE, _, SUBJECT_ALIASED = OK[0]
namespace = vars(SUBJECT_MODULE)

executes_detail = "module imported cleanly"
if SUBJECT_ALIASED:
    executes_detail += " (self-import of {} resolved to the module itself)".format(
        ", ".join(sorted(set(SUBJECT_ALIASED)))
    )
if len(LOADED) > 1:
    executes_detail += "; {}/{} block(s) imported".format(len(OK), len(LOADED))
add("module-executes", True, 20, 20, executes_detail)

CANDIDATES = callables_in(namespace)

# Re-run the remaining blocks with their imports now aliased to the SUBJECT, so
# a separate test file binds to the module under test rather than to itself.
EXTRA_NAMESPACES = []
ALIAS_TARGET[0] = SUBJECT_MODULE
for path, module, err, _aliased in LOADED:
    if path == SUBJECT_PATH:
        continue
    extra = types.ModuleType(path[:-3])
    extra.__file__ = path
    try:
        with open(path, "r", encoding="utf-8") as handle:
            source = handle.read()
        with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
            exec(compile(source, path, "exec"), extra.__dict__)
        EXTRA_NAMESPACES.append(vars(extra))
    except BaseException:
        # A sibling block that will not import is not the module under test; it
        # simply contributes nothing.
        pass
ALIAS_TARGET[0] = None

# --- constant-time comparison ------------------------------------------------

compare_fns = pick(
    CANDIDATES,
    want=["constant_time", "constanttime", "compare", "equal", "same"],
    avoid=["verify", "hash", "check_password"],
    arity=2,
)
compare_detail = "not-found: no two-argument comparison function found"
compare_ok = False
for name, fn in compare_fns:
    for a, b, c in ((PASSWORD, PASSWORD, WRONG), (PASSWORD.encode(), PASSWORD.encode(), WRONG.encode())):
        try:
            with contextlib.redirect_stdout(quiet):
                same = fn(a, b)
                differ = fn(a, c)
                shorter = fn(a, b[:4])
        except Exception as err:
            compare_detail = "runtime-error: {} raised {}".format(name, short(err))
            continue
        if bool(same) and not bool(differ) and not bool(shorter):
            compare_ok = True
            compare_detail = "{}: equal->True, unequal->False, length-mismatch->False".format(name)
        else:
            compare_detail = "wrong-output: {} returned equal={!r} unequal={!r} shorter={!r}".format(
                name, same, differ, shorter
            )
        break
    if compare_ok:
        break
add("constant-time-compare", compare_ok, 20, 20, compare_detail)

# --- PBKDF2 hashing with a random salt ---------------------------------------

hash_fns = pick(
    CANDIDATES,
    want=["hash_password", "hash", "derive", "encode"],
    avoid=["verify", "compare", "check"],
    arity=1,
)
stored = None
hash_name = None
hash_ok = False
hash_detail = "not-found: no single-argument hashing function found"
for name, fn in hash_fns:
    try:
        with contextlib.redirect_stdout(quiet):
            first = fn(PASSWORD)
            second = fn(PASSWORD)
    except Exception as err:
        hash_detail = "runtime-error: {} raised {}".format(name, short(err))
        continue
    if not first or not isinstance(first, (str, bytes, bytearray, tuple, list, dict)):
        hash_detail = "wrong-output: {} returned {!r}".format(name, type(first).__name__)
        continue
    stored = first
    hash_name = name
    if first != second:
        hash_ok = True
        hash_detail = "{}: two hashes of the same password differ (random salt)".format(name)
    else:
        hash_detail = "wrong-output: {} produced an identical digest twice (no random salt)".format(name)
    break
add("salted-hash-random", hash_ok, 20, 20, hash_detail)

# --- verify round trip --------------------------------------------------------

verify_ok = False
if stored is None:
    verify_detail = "not-found: no hash to verify against"
else:
    # A verify function takes the password and whatever hash_password returned,
    # in whichever order and however many pieces. When the hash came back as a
    # TUPLE the pieces are separate parameters (laguna-xs-2.1 returns
    # (digest, salt, iterations) and takes all three back), so the splat forms
    # are tried too — the prompt says "a verify function", not "a
    # two-argument one", and rejecting a 4-arity verify would be the HARNESS
    # failing the check, not the model.
    verify_fns = pick(
        CANDIDATES,
        want=["verify", "check"],
        avoid=["compare_digest"],
        arity=None,
    )
    verify_detail = "not-found: no verify function found"
    spread = tuple(stored) if isinstance(stored, (tuple, list)) else None
    attempts = [
        ((PASSWORD, stored), (WRONG, stored)),
        ((stored, PASSWORD), (stored, WRONG)),
    ]
    if spread is not None:
        attempts.append(((PASSWORD,) + spread, (WRONG,) + spread))
        attempts.append((spread + (PASSWORD,), spread + (WRONG,)))
    for name, fn in verify_fns:
        for args_ok, args_bad in attempts:
            try:
                with contextlib.redirect_stdout(quiet):
                    good = fn(*args_ok)
                    bad = fn(*args_bad)
            except Exception as err:
                verify_detail = "runtime-error: {} raised {}".format(name, short(err))
                continue
            if bool(good) and not bool(bad):
                verify_ok = True
                verify_detail = "{}: correct password -> True, wrong password -> False".format(name)
                break
            verify_detail = "wrong-output: {} returned correct={!r} wrong={!r}".format(name, good, bad)
        if verify_ok:
            break
add("verify-round-trip", verify_ok, 25, 25, verify_detail)

# --- the unit tests the prompt asked for --------------------------------------

suite = unittest.TestSuite()
case_count = 0
loader = unittest.TestLoader()
seen_cases = set()
for source_ns in [namespace] + EXTRA_NAMESPACES:
    for name, obj in list(source_ns.items()):
        if not (inspect.isclass(obj) and issubclass(obj, unittest.TestCase)):
            continue
        if obj is unittest.TestCase or id(obj) in seen_cases:
            continue
        seen_cases.add(id(obj))
        tests = loader.loadTestsFromTestCase(obj)
        case_count += tests.countTestCases()
        suite.addTests(tests)

if case_count == 0:
    add("unit-tests-pass", False, 0, 15, "not-found: the module defines no unittest TestCase")
else:
    try:
        with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
            outcome = unittest.TextTestRunner(stream=quiet, verbosity=0).run(suite)
        failed = len(outcome.failures) + len(outcome.errors)
        if failed == 0:
            add("unit-tests-pass", True, 15, 15, "{} test(s) passed".format(case_count))
        else:
            first = (outcome.failures + outcome.errors)[0]
            add(
                "unit-tests-pass",
                False,
                0,
                15,
                "wrong-output: {}/{} test(s) failed — {}".format(
                    failed, case_count, str(first[1]).strip().splitlines()[-1][:200]
                ),
            )
    except BaseException as err:
        add("unit-tests-pass", False, 0, 15, "runtime-error: test run raised {}".format(short(err)))

emit()
`
