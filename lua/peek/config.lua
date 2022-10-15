local module = {}

local config = {
  auto_load = true,
  close_on_bdelete = true,
  syntax = true,
  theme = 'dark',
  update_in_insert = true,
  throttle_at = 200000,
  throttle_time = 'auto',
}

local function optional(predicate)
  return function(value)
    if not value then
      return true
    end
    return predicate(value)
  end
end

local function one_of(values)
  return function(value)
    return type(values) == 'table' and vim.tbl_contains(values, value), 'one of: ' .. table.concat(values, ', ')
  end
end

function module.setup(incoming)
  incoming = incoming or {}

  vim.validate({
    config = { incoming, 'table' },
  })

  vim.validate({
    close_on_bdelete = { incoming.close_on_bdelete, 'boolean', true },
    auto_load = { incoming.auto_load, 'boolean', true },
    syntax = { incoming.syntax, 'boolean', true },
    theme = { incoming.theme, optional(one_of({ 'dark', 'light' })), 'theme name' },
    update_in_insert = { incoming.update_in_insert, 'boolean', true },
    throttle_at = { incoming.throttle_at, 'number', true },
    throttle_time = { incoming.throttle_time, 'number', true },
  })

  config = vim.tbl_extend('force', config, incoming)
end

function module.get(key)
  return config[key]
end

return module
