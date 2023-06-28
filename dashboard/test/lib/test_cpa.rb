require_relative '../test_helper'
require 'cpa'

class CPATest < Minitest::Test
  def setup
    @request = mock
  end

  def test_cpa_experience_no_config
    assert_nil Cpa.cpa_experience(@request, nil, nil)
  end

  def test_cpa_experience_with_override
    result = Cpa.cpa_experience(@request, nil, Cpa::ALL_USER_LOCKOUT)
    assert_equal Cpa::ALL_USER_LOCKOUT, result
  end

  def test_cpa_experience_with_invalid_schedule
    result = Cpa.cpa_experience(@request, {}, nil)
    assert_nil result
  end

  def test_cpa_experience_before_new_user_lockout
    current_time = DateTime.parse('2023-01-01T00:00:00Z')
    schedule = {
      Cpa::NEW_USER_LOCKOUT => '2023-01-02T00:00:00Z',
      Cpa::ALL_USER_LOCKOUT => '2023-01-03T00:00:00Z'
    }
    result = Cpa.cpa_experience(@request, schedule, nil, current_time)
    assert_nil result
  end

  def test_cpa_experience_after_new_user_lockout
    current_time = DateTime.parse('2023-01-02T00:00:01Z')
    schedule = {
      Cpa::NEW_USER_LOCKOUT => '2023-01-02T00:00:00Z',
      Cpa::ALL_USER_LOCKOUT => '2023-01-03T00:00:00Z'
    }
    result = Cpa.cpa_experience(@request, schedule, nil, current_time)
    assert_equal Cpa::NEW_USER_LOCKOUT, result
  end

  def test_cpa_experience_after_all_user_lockout
    current_time = DateTime.parse('2023-01-03T00:00:01Z')
    schedule = {
      Cpa::NEW_USER_LOCKOUT => '2023-01-02T00:00:00Z',
      Cpa::ALL_USER_LOCKOUT => '2023-01-03T00:00:00Z'
    }
    result = Cpa.cpa_experience(@request, schedule, nil, current_time)
    assert_equal Cpa::ALL_USER_LOCKOUT, result
  end
end
