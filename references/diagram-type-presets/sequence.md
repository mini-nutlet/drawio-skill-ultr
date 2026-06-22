# Sequence Diagram Preset

## Layout: FLOW (top-down lifelines)
## Default Theme: blueprint
## Node Budget: ≤8 participants, ≤20 messages

## Lifeline Convention
- Participant: rounded-rectangle at top + vertical dashed line
- Activation bar: narrow rectangle on lifeline

## Message Convention
- Synchronous: solid arrow → (filled head)
- Asynchronous: dashed arrow → (open head)
- Return: dashed arrow (optional, lighter stroke)

## Label Convention
- Message: "methodName(params)" on arrow
- Self-call: short loop arrow back to same lifeline
