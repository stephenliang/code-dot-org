module Pd::WorkshopFilters
  extend ActiveSupport::Concern

  QUERY_BY_SCHEDULE = 'schedule'
  QUERY_BY_END = 'end'

  # Currently only csf is needed. This can be extended in the future.
  COURSE_MAP = {
    csf: Pd::Workshop::COURSE_CSF
  }.stringify_keys.freeze

  included do
    before_action :load_workshops
  end

  def load_workshops
    # Default to the last week, by schedule
    end_date = params[:end] || Date.today
    start_date = params[:start] || end_date - 1.week
    query_by = params[:query_by] || QUERY_BY_SCHEDULE
    course = params[:course]

    @workshops = Pd::Workshop.in_state(::Pd::Workshop::STATE_ENDED)
    unless current_user.admin?
      @workshops = @workshops.organized_by current_user
    end

    # optional '-' (meaning not) followed by a course name
    if course
      puts "course: #{course}"
      match = /^(-)?(.+)$/.match course
      course_name = COURSE_MAP[match[2]]
      if match[1]
        @workshops = @workshops.where.not(course: course_name)
      else
        @workshops = @workshops.where(course: course_name)
      end
    end

    if query_by == QUERY_BY_END
      @workshops = @workshops.end_on_or_after(start_date).end_on_or_before(end_date)
    else # assume by schedule
      @workshops = @workshops.start_on_or_after(start_date).start_on_or_before(end_date)
    end
  end
end
