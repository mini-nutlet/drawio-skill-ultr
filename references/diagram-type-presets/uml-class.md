# UML Class Diagram Preset

## Layout: TREE (inheritance) or GRID (associations)
## Default Theme: editorial or blueprint
## Node Budget: ≤15 classes, ≤20 relationships

## Class Box Convention
```
┌──────────────────────┐
│ ClassName            │ ← Bold, centered
├──────────────────────┤
│ - privateField: Type │ ← Regular
│ # protectedField     │
│ + publicMethod()     │
└──────────────────────┘
```

## Relationship Convention
- Inheritance: solid line, hollow triangle arrow
- Implementation: dashed line, hollow triangle
- Association: solid line, open arrow
- Aggregation: hollow diamond at whole side
- Composition: filled diamond at whole side
- Dependency: dashed line, open arrow
