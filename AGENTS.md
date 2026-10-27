

<!-- spiderbrain:start v=1 fp=b714664ad3f85a1f commit=d169ea2558b153c9af6bda0a54ac096f6ae480ff -->
## Repo understanding (SpiderBrain)

This repo carries a committed brain in `.spiderbrain/`: a deterministic map of SiswaPro's
own structure (14 files). Built locally from script-tag + import facts (public cloud
brain on this key belongs to another repo — netscope — so it was replaced).

Fastest use:
    npx spiderbrain mcp            # MCP for agents
    spiderbrain blast <path>       # what a change reaches
    spiderbrain keystones          # load-bearing files

Keystones (reach): vendor/supabase-config.js + supabase.umd.js (6), www/auth.js (5),
www/logic.js + www/localdb.js (4), www/subjects.js + www/sync.js (3).

Deterministic: regenerates from commit d169ea2558b153c9af6bda0a54ac096f6ae480ff
(fingerprint b714664ad3f85a1f). Do not hand-edit between the markers.
<!-- spiderbrain:end -->
