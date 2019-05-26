---
title: Two Number Sum
date: "2019-04-25T22:12:03.284Z"
author: Ben Ebsworth
description: 'self-explanation of approach to solving th Two Number Sum problem, with some basic benchmark analysis in Go'
labels: algorithms,personal,go,python
release: true
---

In this article we discuss a very common, and fairly simple algorithm problem, the __Two Number Sum__.

The challenge is as follows:

> Write a function that takes in a non-empty array of distinct integers and an integer representing a target sum. If any two numbers in the input array sum up to the target sum, the function should return them in an array, in sorted order. If no two numbers sum up to the target sum, the function should return an empty array. Assume that there will be at most one pair of numbers summing up to the target sum.

**Example**

> Sample input: [3, 5, -4, 8, 11, 1, -1, 6], 10


> Sample output: [-1, 11]

## Non-optimal solution

```python
def twoNumberSum(array, targetSum):
	if (len(array) <= 0):
		return []
	for i in range(len(array)):
		for j in range(i+1, len(array)):
			if array[i] + array[j] == targetSum:
				return sorted([array[i], array[j]])
	return []
```

We can solve this problem using a non-optimal and more "brute" force approach, where we compare every pair of integers in the input, comparing with the target value. This would imply the following constraints:

> Time: O(n^2) - we have to iterate over the list of size n twice

> Memory - O(1) - we compare the values on each iteration, never storing results until the end.

This could be sufficient if we are dealing with a reasonable small value of n, and have memory space constraints. However, as we need to scale this algorithm to larger n, and potentially enable the distribution across a number of machines, we need to think about more effective solutions.

## Optimization through memoization

[Memoization](https://en.wikipedia.org/wiki/Memoization) employs a basic technique of storing results of previous function calls, preventing unnecessary duplicated calculations. We will use this approach to store the results of previous two number sum comparisons to then lookup from when evaluation future comparisons.

```python
def twoNumberSum(array, targetSum):
	if (len(array) <= 0):
		return []
	previousNum = []
	for i in range(len(array)):
		y = targetSum-array[i]
		if y in previousNum:
			return sorted([array[i],y])
		previousNum.append(array[i])
	return []
```

So now we're populating the `previousNum` table, which gives us the "memory" or ability to evaluate whether any of the previously encountered numbers will be suitable to reach `targetSum`. Effectively reducing the second iteration we were doing in the first approach.

> Time: O(n) - we still have to iterate over the list once, and insertion and lookups are O(1) for a hash table

> Memory: O(n) - we are building a table of potentially n items, which we then lookup

So the trade-off in this solution is to make use of memory to minimise additional computations, utilising the properties of a hash table which gives us `O(1)` insert and lookup capabilities. The key considerations that go into the trade-off would be what are you limited by in terms of computational resources, is it memory space or compute space. An interesting philosophical extreme to consider is the correlation of compute space with time, and memory space with mass. Do you have infinite time, or infinite mass? An interest physical conundrum. If we look to some of the strange objects in our universe, such as a blackhole, it has infinite density, as it collapses a given mass into zero volume, effectively dividing by zero - where `Density = Mass/Volume`. What does this imply about the memory space of a blackhole?
