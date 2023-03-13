# peek.nvim

*Markdown preview plugin for [Neovim](https://github.com/neovim/neovim)*

![preview](media/peek.jpg)

### :sparkles: Features

- live update
- synchronized scrolling
- github-style look
- [TeX](https://github.com/KaTeX/KaTeX) math
- [Mermaid](https://github.com/mermaid-js/mermaid) diagrams

### :battery: Requirements

- [Deno](https://deno.land) v1.25.0+

### :electric_plug: Installation

[![LuaRocks](https://img.shields.io/luarocks/v/toppair/peek.nvim?logo=lua&color=purple)](https://luarocks.org/modules/toppair/peek.nvim)

```lua
use({ 'toppair/peek.nvim', run = 'deno task --quiet build:fast' })
```

### :wrench: Configuration

```lua
-- default config:
require('peek').setup({
  auto_load = true,         -- whether to automatically load preview when
                            -- entering another markdown buffer
  close_on_bdelete = true,  -- close preview window on buffer delete

  syntax = true,            -- enable syntax highlighting, affects performance

  theme = 'dark',           -- 'dark' or 'light'

  update_on_change = true,

  app = 'webview',          -- 'webview', 'browser', string or a table of strings
                            -- explained below

  filetype = { 'markdown' },-- list of filetypes to recognize as markdown

  -- relevant if update_on_change is true
  throttle_at = 200000,     -- start throttling when file exceeds this
                            -- amount of bytes in size
  throttle_time = 'auto',   -- minimum amount of time in milliseconds
                            -- that has to pass before starting new render
})
```

### :paperclip: `app` option

Preview opens in a [webview](https://github.com/webview/webview_deno) window by default.
You can set this option to `'browser'` (will use your default browser as previewer) or
specify browser along with arguments:

`app = 'chromium'`

`app = { 'chromium', '--new-window' }`

[Chromium based browser](https://en.wikipedia.org/wiki/Chromium_(web_browser)#Browsers_based_on_Chromium) is recommended.

### :bulb: Usage

| method ||
|-|-|
| open    | Open preview window                                 |
| close   | Close preview window                                |
| is_open | Returns `true` if preview window is currently open  |

Example command setup:

```lua
vim.api.nvim_create_user_command('PeekOpen', require('peek').open, {})
vim.api.nvim_create_user_command('PeekClose', require('peek').close, {})
```

The following keybinds are active when preview window is focused:

| key ||
|-|-|
| k | scroll up               |
| j | scroll down             |
| u | scroll up half a page   |
| d | scroll down half a page |
| g | scroll to top           |
| G | scroll to bottom        |

### :mag: Preview window

Use your window manager to set preview window properties. Window title is `Peek preview`.

**[i3wm](https://i3wm.org/) examples:**

```
# do not focus preview window on open
no_focus [title="^Peek preview$"]
```

Use `i3-msg` to manipulate current layout and open preview window at desired position:

```lua
local peek = require('peek')

vim.api.nvim_create_user_command('PeekOpen', function()
  if not peek.is_open() and vim.bo[vim.api.nvim_get_current_buf()].filetype == 'markdown' then
    vim.fn.system('i3-msg split horizontal')
    peek.open()
  end
end, {})

vim.api.nvim_create_user_command('PeekClose', function()
  if peek.is_open() then
    peek.close()
    vim.fn.system('i3-msg move left')
  end
end, {})
```
