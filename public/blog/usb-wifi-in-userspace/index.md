---
title: A USB Wi-Fi driver with no driver
date: '2026-09-11T00:00:00.000Z'
description: >-
  Driving a UGREEN AX900 (AICSEMI AIC8800D80) Wi-Fi dongle from user space on
  macOS, with SIP on and no kernel extension: firmware bootstrap, the LMAC
  control plane, WPA2 from scratch and a utun bridge. Every wall along the way
  turned out to be a wrong assumption with a passing test behind it.
labels: 'hardware,usb,wifi,macos,reverse-engineering,drivers'
heroImage: /blog/usb-wifi-in-userspace/hero.webp
release: true
author: Ben Ebsworth
takeaways:
  - >-
    A modern Wi-Fi dongle can be driven entirely from user space on macOS with
    SIP enabled: libusb for the radio, a utun for the IP layer, and no kernel
    extension anywhere. The only privilege needed is root, for two ordinary
    reasons.
  - >-
    Every wall in the project was a wrong assumption with a passing test behind
    it. A self-consistent wrong wire format round-trips perfectly, and a checker
    written from the same assumption agrees with it.
  - >-
    A week went into engineering around a 0x170000 'write wall' that did not
    exist. It was the wrong firmware image for the silicon, and the correct one
    lives entirely below that address.
  - >-
    The hardware sets the pace: this chip allows one MM_RESET per flash and
    never crashes back to its flashable mode, so every clean test costs a
    physical unplug and replug.
markdown_url: /blog/usb-wifi-in-userspace/
canonical_url: 'https://benebsworth.com/blog/usb-wifi-in-userspace/'
---
## Key takeaways

- A modern Wi-Fi dongle can be driven entirely from user space on macOS with SIP enabled: libusb for the radio, a utun for the IP layer, and no kernel extension anywhere. The only privilege needed is root, for two ordinary reasons.
- Every wall in the project was a wrong assumption with a passing test behind it. A self-consistent wrong wire format round-trips perfectly, and a checker written from the same assumption agrees with it.
- A week went into engineering around a 0x170000 'write wall' that did not exist. It was the wrong firmware image for the silicon, and the correct one lives entirely below that address.
- The hardware sets the pace: this chip allows one MM_RESET per flash and never crashes back to its flashable mode, so every clean test costs a physical unplug and replug.

This started the way most hardware projects do: I ordered the cheapest thing that would do the job. A UGREEN AX900, a perfectly ordinary USB Wi-Fi 6 dongle, about the size of a thumb drive, the sort of thing that works on any Windows laptop the moment you plug it in. I needed a second radio for reasons I will get to. It arrived, I plugged it into a MacBook, and macOS mounted a tiny disk image containing a Windows installer. That was the whole experience.

There is no macOS driver for this dongle. Apple does not ship one, the vendor does not ship one, and the Linux driver is a kernel module for a kernel you are not running. The sensible move at that point is to return it and buy the one adapter with a Mac driver. Instead I wanted to know what it would actually take to make it work.

So I wrote the driver in Go, and it never touches the kernel. The dongle associates to a WPA2 network, completes the 4-way handshake, takes a DHCP lease and carries real IP traffic, all from a normal process with System Integrity Protection (SIP) on and no kernel extension anywhere. This post is about how that works, and more honestly, about the month of wrong turns it took to get there. The wrong turns are the interesting part.

Here is the thing working, from a cold replug, in one command:

```
CONNECTED to "<guest network>": bssid=d2:e8:f0:xx:xx:xx band=0 freq=2412
EAPOL: msg3 MIC ok / GTK unwrapped (16 bytes, idx 1)
mm_key_add PTK: CFM ok / mm_key_add GTK: CFM ok / control port open
NET: offer 192.168.2.243 from 192.168.2.1 (lease 3600s)
NET: gateway 192.168.2.1 at 74:24:9f:xx:xx:xx
NET: ping 192.168.2.1 seq=1 rtt=3ms ... 4/4 ping replies
```

The code lives in the `event-horizon` repo, and there is a signed, notarised macOS app on its [releases page](https://github.com/castlemilk/event-horizon/releases/latest) if you have the same dongle. The rest of this post walks through what it had to do.

> [GithubLink component] GitHub link card. The rendered post links to a repository; this card was inlined here for the human reader.

Link: https://github.com/castlemilk/event-horizon

## Why bother

The practical reason was a Starlink dish. The terminal serves a gRPC API on `192.168.100.1:9200`, and my laptop's `en0` lives on a different subnet and could not reach it at all. 100% packet loss, every time. A second radio joined to the Starlink router's own network, bridged into a `utun` with a host route for that one address, turns the dish into an ordinary socket connection with no change to any client code.

That framing matters. The dongle was never the point. The point was that "there is no driver for this" turned out not to be a stopping condition. A standard USB dongle that does not work on Apple hardware is a very common situation, and I wanted to know how far user space could go before you actually needed the kernel. The answer is all the way.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

If the host can already reach the target on its own, a passing test proves nothing. The check that made every result meaningful was one line: `route -n get 192.168.100.1 | grep interface`, and the answer had to be `utun` something, never `en0`. Before the bridge existed, ping to the dish was 100% loss. After, 0%. Without that negative control I would have "reached the dish" on the first day, over the wrong interface.

## What the kernel normally does for you

A Wi-Fi adapter on a laptop feels like one thing. It is actually a tall stack, and almost every layer of it is provided by the kernel or a vendor kernel extension. Take those away and you are left with a USB device that speaks bulk transfers, and a network stack that wants Ethernet frames. Everything in between has to exist somewhere.

> [DriverLayerStack component] Nine-row stack of everything the user-space driver implements, bottom (USB transport) to top (IP over a utun): what each layer does and which component normally provides it. Rows the kernel or a vendor kernel extension would normally own are shaded amber. A static figure in the rendered post.

The only privileged thing in the whole system is `root`, and it is needed for two boring reasons. libusb has to claim the USB interface exclusively, and creating a `utun` requires it. No kext, no DriverKit, no SIP disabled. About 15,000 lines of Go, most of it wire-format code, sit between those two syscalls.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.



> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

## One dongle, three identities

The first surprise is that the device you plug in is not a Wi-Fi adapter. It enumerates as USB mass storage, a 3.7 MB FAT16 volume holding one file, `Setup.exe`. This is the ZeroCD trick that 3G modems used a decade ago: ship the driver on the device, let Windows run it, and have the installer flip the device into its real mode.

On macOS the disk image mounts and that is where the story ends. So we have to do what the Windows installer does, by hand. A SCSI start/stop eject on the storage LUN makes the dongle drop off the bus and come back as a bare boot ROM, waiting for firmware. Upload the firmware and it drops off again and comes back a third time, under a completely different vendor ID.

> [UsbIdentityChain component] Interactive three-stage diagram of the USB identities a UGREEN AX900 (AIC8800D80) dongle presents over its life: a69c:5723 ZeroCD mass storage, then a69c:8d80 boot ROM after a SCSI eject, then 368b:8d85 once firmware is uploaded and running. Tapping a stage shows what happens there and what triggers the next transition. The rendered post has the live version.

That last identity is worth pausing on. The Windows INF binds `USB\VID_368b&PID_8d85`, and nothing about the `a69c` vendor ID the device advertises in its other two states tells you that. If you search for "368b:8d85" you find the driver. If you search for what `lsusb` shows you when you plug it in, you find storage.

## Where the firmware comes from

The boot ROM wants four blobs, and only one of them is chip-specific. The `adid`, `patch` and `patch_table` blobs are the same ones radxa publishes for their Linux boards, fetchable with SHA-256 verification. The main image, `fmacfw_8800d80_u02_ipc.bin`, is a different story.

| Blob | Size | Source |
|---|---|---|
| `fmacfw_8800d80_u02_ipc.bin` | 324,848 B | carved from the vendor's own Windows driver |
| `fw_adid_8800d80_u02.bin` | 1,708 B | radxa upstream |
| `fw_patch_8800d80_u02.bin` | 32,700 B | radxa upstream |
| `fw_patch_table_8800d80_u02.bin` | 1,384 B | radxa upstream |

The carve is my favourite concrete detail in the project. That FAT16 volume holds an Inno Setup 6.1.0 installer with the drivers LZMA-compressed inside, so a raw signature scan of the volume finds nothing and you have to unpack it properly (`innoextract` does the job). Out comes `win10_x64/aicloadfw.Sys`, the boot ROM loader, with the firmware image embedded in its `.data` section. You find it by an exact two-word signature at the start of an ARM image:

```
u32[0] = 0x001A0000   // initial stack pointer
u32[1] = 0x001201A5   // reset vector (Thumb bit set)
```

Exactly one hit in the whole file. Its length is self-describing too: the word at `blob+0x454` holds the end address `0x0016F4F0`, and `0x16F4F0 - 0x120000` is 324,848 bytes. The `win7_x64` image is the same length and differs in 11 bytes, so you pin the Windows 10 variant specifically.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Three of the four blobs are fetchable from a public repo with hash verification, and the fourth comes off the dongle's own ZeroCD volume. Every user already owns a copy of the firmware. It arrived in the box. The software just has to know where to look for it.

## The wall that was not there

Now the part I actually want to write about.

For about a week the project believed the chip had a hardware write wall at `0x170000`. Firmware uploads above that address silently failed: the boot ROM accepted every write, reported success, and the readback did not match. The commit log from 2026-08-23 is an escalating sequence of attempts to engineer around it:

```
default to 1KB block write below wall and 4B word write above with descriptor zones skipped
use 16B block writes above wall with widened descriptor zones
use 256B block writes above wall to prevent USB FIFO saturation
add 2ms pacing delay for writes above wall to prevent FIFO backpressure
enable automatic 200ms pause every 25 ops above wall to flush write pipeline
track window bytes and flush dirty cache (1.2s pause) every 4KB above wall
sleep 100ms after every op above wall to eliminate all FIFO pressure
```

Seven increasingly baroque theories. FIFO saturation, backpressure, a dirty write cache, pacing. Each one produced a plausible partial improvement, which is the cruellest thing an experiment can do. Some bytes above the wall did land. The "wall" seemed porous, so of course it looked like a timing problem.

There was no wall. The vendor driver selects firmware by chip ID, and for `chip_id=0x07` the correct image loads at `0x120000` and lives entirely below `0x170000`. The 358,072-byte `fmacfw_8800d80_u02.bin` that radxa publishes, the one that seemed like the obvious main image, is for different silicon. Every byte written above the wall was being written because the wrong firmware was being flashed. The wall only ever existed as a property of a mistake.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

The engineering was competent. The premise was wrong. And nothing about the failure mode announced that.

I find this one genuinely uncomfortable to look back on, because every individual step was reasonable. Reads above the address failed, so the address was special. Some writes landed, so it was timing. The fix was not a cleverer write strategy, it was reading the chip ID branch in the Windows loader's disassembly and noticing the image it selected was a different size.

## Four walls, every one with a passing test

The write wall was the most expensive wrong turn but not the most instructive. Once the firmware was right and the radio was calibrated (that took a separate week, and its own wrong message ID), the project hit four more walls in a row on the data path. The pattern across them is the thing I most want to remember.

| Wall | The test that hid it |
|---|---|
| EAPOL-Key descriptor 8 bytes short (no `Reserved` field) | round-tripped our own `Encode` |
| 8-byte aggregated USB TX header | matched a function `CONFIG_USB_TX_AGGR=n` never compiles |
| TX pipe alternation dropping handshake message 4 | a debug probe nobody retired once it had answered |
| RX decoder expecting Ethernet at offset 60 | asserted the wrong layout, passed throughout |

Look at the second one, because it is the sneakiest. The Linux reference driver has two functions that build a USB TX record: one writes a 4-byte header, the other an 8-byte aggregated header. I read the aggregated one, matched it exactly, and had a test proving I matched it. It is compiled only under `CONFIG_USB_TX_AGGR`, which the reference Makefile sets to `n`. Send the 8-byte form and the firmware reads byte 2 as the record type, sees a length byte where it expects `0x01`, and silently discards every data frame. libusb reported success on every single write.

The conclusion I drew from three of these walls at once was "management TX radiates but data TX is dead". A confident, specific, hardware-level diagnosis. It was never true. The firmware was throwing away malformed records and nothing, at any layer, said so.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

A self-consistent wrong layout round-trips perfectly, and a checker written from the same wrong assumption agrees with it. An "independent" verification in another language proves nothing if it reuses your offsets. Pin formats to something you did not write: a frame laid out by hand from the standard, a byte string lifted from the reference driver, or real captured bytes. And when a whole subsystem looks dead, suspect that a passing test is asserting the wrong thing before you suspect the silicon.

That rule is now written into the repo's debugging skill, next to the list of negative results that must not be retried. Several dead ends in this project were re-attempted because they were only vaguely remembered, which is its own small lesson about keeping a lab notebook.

## The hardware sets the pace

Some of the constraints here have no software analogue, and they explain why a month of evenings went into something that is, on paper, a few thousand lines of protocol code.

1. **One `MM_RESET` per firmware instance.** A second reset on a running stack permanently kills receive until re-flash. Not "degrades". Kills.
2. **Only the first session after `stack_start` has a reliable radio.** A run that prints `stack_start: NO CFM` is already dead, and anything it prints afterwards is meaningless.
3. **Re-flashing requires ZeroCD, and this firmware never crashes back to it.** So every clean test costs a physical unplug and replug. Not a metaphor: a human has to walk over and pull the dongle.
4. **`sudo` strips the environment**, so every debug switch has to be a CLI flag, never an environment variable. I lost an afternoon to `--dump` doing nothing.

Rule 3 is the one people without hardware experience find surprising, and it is the reason the whole bring-up eventually collapsed into a single command. When each experiment costs a walk across the room, you batch: flash, stack start, associate, handshake, DHCP and bridge, all in one go, and you make the tool refuse to run against a firmware instance that has already spent its one reset.

> [BringupTimeline component] Horizontal timeline of a measured cold-replug bring-up (about 32 s total): flash 344 ms, firmware upload 26.5 s, associate 2.29 s, WPA2 handshake 107 ms, DHCP and utun bridge 3.05 s. Widths are on a square-root scale so the short stages remain visible; hovering a segment shows what happens inside it.

The 26 seconds of firmware upload dominate. That is 360 KB going over bulk endpoints in small windows with the boot ROM's descriptor zones skipped, and it is the one number here I have not tried to improve, because a replug costs more than the wait.

## What the working stack actually does

With the wrong turns out of the way, the happy path is pleasingly linear. Each step is a message on the LMAC control plane (the firmware's internal MAC layer, driven with `MM_`, `ME_` and `SM_` messages), sent on bulk OUT endpoint 2 and confirmed on the single bulk IN.

- **Bring-up**: `reset`, `me_config`, `chan_config`, `start`, coexistence, `add_if`. The order comes from the Windows driver's disassembly, not the Linux one. The two differ, and so do the message IDs. On this firmware `0x77` is transmit power *level* and `0x79` is transmit power *offset*. Send the level table under `0x79` and the receiver is stone deaf, which looks exactly like broken RF hardware.
- **Scan**: `scanu_start_req`, once per session. Re-issuing it restarts the scan so it never completes. Results arrive as config frames carrying the full beacon.
- **Associate**: `SM_CONNECT_REQ` with an RSN information element, fire-and-forget, then wait for the asynchronous `SM_CONNECT_IND`. A status of 1 with an all-zero BSSID means the wrong channel, not the wrong password.
- **WPA2**: host-driven. Four EAPOL-Key frames, PBKDF2 for the PMK, the pseudo-random function for the PTK, an RFC 3394 key unwrap for the GTK, then `MM_KEY_ADD` twice. Control port open.
- **Data**: the firmware delivers raw 802.11 MPDUs, not Ethernet. Strip the 24-byte header (plus QoS, plus HT control if present), skip the 8-byte CCMP header the hardware leaves in place, skip LLC/SNAP, and remember that for AP-to-station frames the destination is `addr1` and the source is `addr3`.
- **IP**: a small DHCP client, ARP for the gateway, then the frames go into a `utun` and macOS takes it from there. A host route for `192.168.100.1` points at the tunnel, and `grpcurl` reaches the dish.

The Starlink terminal answers on `192.168.100.1:9200` in about 22 ms. That was the whole objective, and it works.

## The device disappearing is the success signal

Once the radio worked, the software around it produced a matching set of bugs, and they all had the same shape as the firmware ones: something failed and nothing recorded it.

- The link state machine reported `up`, bridged on `utun11`, for a dongle that had been physically unplugged. The bridge exits cleanly when the device goes away, so a zero exit code read as "still running". The `utun` and its route outlive the radio, so nothing downstream noticed either.
- `nohup` was silently refusing to start the daemon at all. Under an AppleScript `with administrator privileges` there is no controlling terminal, so `nohup` fails with "can't detach from console" and exits *without running the command*, while the `echo started` after it still printed "started". Output went to `/dev/null`. One redirect made it obvious.
- Every successful bring-up killed the GUI app, because the flash step killed "device holders", including an app that had never opened the device. No crash report, so it looked like spontaneous disappearance.
- A working dongle rendered as *absent*. Once libusb claims the interface exclusively it leaves the system's USB view entirely, so it vanished from the UI at the exact moment it started carrying traffic.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

That last one is the closing beat of the whole project. The device disappearing from the bus **is** the success signal. It means the driver owns it. And for weeks, nothing in the UI, the logs or the state machine said so. The fix was a single line in the topology view: show the dongle as "in use by the driver" when it has left the bus, rather than as gone.

## What I would tell past me

Read the chip ID branch of the vendor loader before touching an upload strategy. Pin every wire format to bytes you did not write. Instrument before theorising: `--dump` plus a record-boundary tracer found in one run what days of reasoning missed. Write down the negative results somewhere you will actually re-read. And when a whole subsystem looks dead, suspect a message ID before you suspect the silicon.

None of this is specific to this chip. The AIC8800D80 is just the one that taught me.

The DriverKit plan for exposing the link as a real `enX` interface is still in the repo, superseded and kept for reference. The `utun` bridge does everything I need. There is also a small MCP server so an agent can scan, connect and diagnose the link itself, which is how most of the late debugging actually happened. Perhaps that is the next post.

## Reading further

- The [event-horizon repo](https://github.com/castlemilk/event-horizon), and in particular `docs/HANDOVER-aic8800d80.md` (status, firmware facts, operating rules, failure table) and the debugging skill in `.claude/skills/usb-wifi-driver-debug/`, which is the distilled version of everything above.
- [radxa-pkg/aic8800](https://github.com/radxa-pkg/aic8800): the Linux USB fullmac driver for this family. Authoritative C for the struct layouts (`lmac_msg.h`, `rwnx_msg_tx.c`, `rwnx_rx.c`, `rwnx_tx.c`). Use it for layouts, and use the Windows disassembly for *this* firmware's message IDs and call order.
- [IEEE 802.11-2020](https://standards.ieee.org/ieee/802.11/7028/), section 12.7, for the EAPOL-Key descriptor. It has the 8-byte Reserved field. I should have read it first.
- [RFC 3394](https://www.rfc-editor.org/rfc/rfc3394), AES key wrap, for unwrapping the GTK out of message 3.
- [innoextract](https://constexpr.org/innoextract/), which is how the firmware comes out of the installer on the dongle's own volume.
