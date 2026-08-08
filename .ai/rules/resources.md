---
paths:
  - 'app/Http/Resources/**'
---

# Resources

## Call resolve() when handing a Resource to Inertia
A JsonResource or ResourceCollection passed straight to Inertia::render() or a shared prop arrives wrapped in a `data` key, which is not what the pages read.

Pass `(new FooResource($model))->resolve($request)` or `FooResource::collection($models)->resolve($request)` instead.
