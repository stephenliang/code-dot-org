module SQS

  # A collection of Counters for the queue processor.
  class Metrics
    attr_accessor :successes, :failures

    def initialize
      @successes = Counter.new
      @failures = Counter.new
    end

    def reset
      lock.synchronize {
        @successes.reset
        @failures.reset
      }
    end

    def to_s
      {'sucesses' => @successes, 'failures' => @failures}.to_json
    end
  end

  # A thread safe counter.
  class Counter

    def initialize
      @lock = Mutex.new
      reset
    end

    def value
      @value
    end

    def increment(added_value)
      @lock.synchronize {
        @value += added_value
      }
    end

    def set(value)
      @lock.synchronize {
        @value = value
      }
    end

    def reset
      @lock.synchronize {
        @value = 0
      }
    end
  end

end
