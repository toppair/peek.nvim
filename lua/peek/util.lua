local M = {}

local function get_color_scheme()
  local color_scheme = 'light'
  local system = vim.loop.os_uname().sysname
  if system == 'Darwin' then
    if vim.fn.executable('defaults') ~= 0 then
      local appleInterfaceStyle = vim.fn.system({ 'defaults', 'read', '-g', 'AppleInterfaceStyle' })
      if appleInterfaceStyle:find('Dark') then
        color_scheme = 'dark'
      end
    end
  end

  return color_scheme
end

M.get_color_scheme = get_color_scheme
return M
