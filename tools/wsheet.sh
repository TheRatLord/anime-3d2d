#!/bin/bash
# usage: tools/wsheet.sh <seqdir> <crop w:h:x:y> <step> <rows> [scale] [ref frame]
# -> <seqdir>-strips.png (cropped frames stacked) and <seqdir>-diff.png (|frame - ref frame| x8, grey)
d=$1; crop=$2; step=${3:-1}; rows=${4:-10}; sc=${5:-1280}; ref=${6:-000}
ffmpeg -v error -y -start_number 0 -i $d/f%03d.png -vf "select='not(mod(n,$step))',crop=$crop,scale=$sc:-1,tile=1x$rows" -frames:v 1 $d-strips.png
ffmpeg -v error -y -start_number 0 -i $d/f%03d.png -loop 1 -i $d/f$ref.png -filter_complex "[0][1]blend=all_mode=difference:shortest=1,select='not(mod(n,$step))',crop=$crop,scale=$sc:-1,format=gray,lutyuv=y=val*8,tile=1x$rows" -frames:v 1 $d-diff.png
