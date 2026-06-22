# ML Model Diagram Preset

## Layout: LAYERED or FLOW
## Default Theme: editorial (papers) or blueprint (presentations)
## Node Budget: ≤20 nodes, ≤25 edges

## Shape Convention
- Input/Output tensor: `rounded-rectangle` + dashed border
- Convolution layer: `rounded-rectangle`, blue
- Pooling layer: `rounded-rectangle`, cyan
- Attention block: `rounded-rectangle`, amber
- Feed-forward: `rounded-rectangle`, green
- Normalization: `rounded-rectangle`, grey
- Residual/skip connection: `dashed` edge, purple

## Label Convention
- Layer name: bold, 12-14pt
- Tensor shape: regular, 10pt, grey — "(B, 256, 256, 3)"
- Formula: $$...$$ delimiters

## Supported Architectures
- Transformer (encoder-decoder + attention blocks)
- CNN (conv-pool-FC classifier)
- RNN/LSTM (recurrent + state flow)
- RAG (retrieval + generation pipeline)
