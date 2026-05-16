# Minimal Xiaohongshu Test Input

Use this only as a smoke-test reference.

## Example live URL shape

```text
https://www.xiaohongshu.com/livestream/570277464071139181
```

The current UI also accepts newer shared link variants that contain extra path segments and query parameters, then normalizes them internally.

## Example cookie string shape

```text
a1=...; web_session=...; webId=...; gid=...; xsecappid=xhs-pc-web
```

## Smallest practical validation checklist

1. start backend
2. start frontend
3. open `/zh/login`
4. open platform settings
5. paste Xiaohongshu cookie string or browser-exported cookie JSON
6. add one Xiaohongshu live room
7. verify streamer appears and backend can detect live status

## Notes

- This file is not an API fixture.
- It is a human-readable test reference for future migration work.
