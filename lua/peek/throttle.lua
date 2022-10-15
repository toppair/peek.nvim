return function(fn, timeout)
  return setmetatable({
    timer = nil,
    timeout = timeout,
    set_timeout = function(self, new_timeout)
      self.timeout = new_timeout
    end,
    clear = function(self)
      if self.timer then
        self.timer:stop()
        if not self.timer:is_closing() then
          self.timer:close()
        end
      end
    end,
  }, {
    __call = (function()
      local busy, pending, args = false, false, nil
      local defer_fn = vim.defer_fn

      local function exec(self, ...)
        fn(...)
        self.timer = defer_fn(function()
          if not pending then
            busy = false
            return
          end
          exec(self, args)
          pending = false
        end, self.timeout or 10)
      end

      return function(self, ...)
        if busy then
          pending, args = true, ...
          return
        end
        busy = true
        exec(self, ...)
      end
    end)(),
  })
end
