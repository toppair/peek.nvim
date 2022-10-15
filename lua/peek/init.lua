local app = require('peek.app')
local config = require('peek.config')
local throttle = require('peek.throttle')

local nvim_buf_get_lines = vim.api.nvim_buf_get_lines
local nvim_create_augroup = vim.api.nvim_create_augroup
local nvim_create_autocmd = vim.api.nvim_create_autocmd
local nvim_del_augroup_by_id = vim.api.nvim_del_augroup_by_id
local concat = table.concat
local line = vim.fn.line

local module = {}

local augroup, throttle_at, throttle_time, initialized

local function get_buf_content(bufnr)
  return concat(nvim_buf_get_lines(bufnr, 0, -1, false), '\n')
end

local function open(bufnr)
  augroup = nvim_create_augroup('PeekActiveAugroup', { clear = true })

  app.init(function()
    augroup = nvim_del_augroup_by_id(augroup)
  end)
  app.base(vim.fn.fnamemodify(vim.uri_to_fname(vim.uri_from_bufnr(bufnr)), ':p:h'))
  app.show(get_buf_content(bufnr))
  app.scroll(line('.'))

  local show_throttled = throttle(function(content)
    if augroup then
      app.show(content)
    end
  end)

  local function show()
    local content = get_buf_content(bufnr)
    local len = #content

    if len > throttle_at then
      show_throttled:set_timeout(throttle_time or len / 200)
      return show_throttled(content)
    end

    app.show(content)
  end

  nvim_create_autocmd('BufWritePost', {
    group = augroup,
    buffer = bufnr,
    callback = function()
      app.show(get_buf_content(bufnr))
    end,
  })

  nvim_create_autocmd('CursorMoved', {
    group = augroup,
    buffer = bufnr,
    callback = function()
      app.scroll(line('.'))
    end,
  })

  if config.get('close_on_bdelete') then
    nvim_create_autocmd('BufDelete', {
      group = augroup,
      buffer = bufnr,
      callback = function()
        app.stop()
      end,
    })
  end

  if config.get('update_in_insert') then
    nvim_create_autocmd('CursorHold', {
      group = augroup,
      buffer = bufnr,
      callback = function()
        show()
      end,
    })

    nvim_create_autocmd('CursorMovedI', {
      group = augroup,
      buffer = bufnr,
      callback = function()
        show()
        app.scroll(line('.'))
      end,
    })
  end

  if config.get('auto_load') then
    nvim_create_autocmd('BufEnter', {
      pattern = '*.md',
      group = augroup,
      callback = function(arg)
        show_throttled:clear()
        open(arg.buf)
      end,
    })
  end
end

local function ensure_init(fn)
  return function(...)
    if not initialized then
      module.setup()
    end
    return fn(...)
  end
end

module.open = ensure_init(function()
  local bufnr = vim.api.nvim_get_current_buf()

  if vim.bo[bufnr].filetype ~= 'markdown' then
    return vim.api.nvim_notify('Not a markdown file', vim.log.levels.WARN, {})
  end

  open(bufnr)
end)

module.close = ensure_init(function()
  app.stop()
end)

module.is_open = ensure_init(function()
  return not not augroup
end)

function module.setup(cfg)
  config.setup(cfg)
  app.setup()
  throttle_at = config.get('throttle_at')
  throttle_time = tonumber(config.get('throttle_time'))
  initialized = true
end

return module
