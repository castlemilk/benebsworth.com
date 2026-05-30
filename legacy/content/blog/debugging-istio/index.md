---
title: Managing Istio 
date: "2019-08-25T22:12:03.284Z"
author: Ben Ebsworth
description: 'Exploring tools and techniques available to troubleshooting Istio and the Envoy Proxy, and configuring common use-cases'
labels: technology,envoy,kubernetes,istio,service mesh
keywords: envoy,kubernetes,service mesh,istio,debugging,troubleshooting,istio broken,service mesh destabilization,configuration,production,microservices,mesh,linkerd,gcp,aws
release: false 
---

# Introduction

Having run a number of production grade clusters in different environments. This post will focus on some of the available tools and techniques available to troubleshoot and understand the functionality of Istio. With Envoy being the core component of the data-plane in a *Istio* *Serivce Mesh*, a lot of these techniques will relate to Envoy and how we can get a deeper understanding into its operation.

Istio is a fairly complex beast, consisting of a number of components for the control-plane, which primarily serve the function of managing the pushing of configuration to our Envoy sidecars.

## Pilot

## Mixer

### Telemetry

### Policy

## Envoy - Sidecars

## Envoy - Gateways

## Security
