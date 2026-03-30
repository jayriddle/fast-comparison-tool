#!/bin/bash
cd "$(dirname "$0")"
open http://localhost:8080
npx serve -l 8080 .
