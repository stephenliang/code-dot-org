require 'test_helper'

class HocCensus2017v3Test < ActiveSupport::TestCase
  test "basic HOC census 2017 v3 submission" do
    submission = build(:hoc_census2017v3)
    assert submission.valid?, submission.errors.full_messages
  end
end
