#!/bin/bash

wscat -c ws://localhost:8000/ws/game/$1/$2
