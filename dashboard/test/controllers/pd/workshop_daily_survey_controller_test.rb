require_relative '../../../../shared/test/spy_newrelic_agent'
require 'test_helper'

module Pd
  class WorkshopDailySurveyControllerTest < ActionDispatch::IntegrationTest
    include WorkshopConstants
    include WorkshopSurveyConstants

    self.use_transactional_test_case = true
    setup_all do
      @unenrolled_teacher = create :teacher
      @enrolled_summer_teacher = create :teacher
      @enrolled_academic_year_teacher = create :teacher
      @enrolled_two_day_academic_year_teacher = create :teacher
      @regional_partner = create :regional_partner
      @facilitators = create_list :facilitator, 2

      @summer_workshop = create :pd_workshop, course: COURSE_CSP, subject: SUBJECT_TEACHER_CON,
        num_sessions: 5, regional_partner: @regional_partner, facilitators: @facilitators
      @summer_enrollment = create :pd_enrollment, :from_user, user: @enrolled_summer_teacher, workshop: @summer_workshop

      @academic_year_workshop = create :pd_workshop, course: COURSE_CSP, subject: SUBJECT_CSP_WORKSHOP_1,
        num_sessions: 1, regional_partner: @regional_partner, facilitators: @facilitators
      @academic_year_enrollment = create :pd_enrollment, :from_user, user: @enrolled_academic_year_teacher, workshop: @academic_year_workshop

      @two_day_academic_year_workshop = create :pd_workshop, course: COURSE_CSP, subject: SUBJECT_CSP_WORKSHOP_5,
        num_sessions: 2, regional_partner: @regional_partner, facilitators: @facilitators
      @two_day_academic_year_enrollment = create :pd_enrollment, :from_user,
        user: @enrolled_two_day_academic_year_teacher, workshop: @two_day_academic_year_workshop

      # TODO: add all shared variables for csf here. DRY
      @enrolled_csf201_teacher = create :teacher
      @csf201_workshop = create :pd_workshop,
        course: COURSE_CSF, subject: SUBJECT_CSF_201, regional_partner: @regional_partner, num_sessions: 1
      @csf201_enrollment = create :pd_enrollment, user: @enrolled_csf201_teacher, workshop: @csf201_workshop
    end

    # Array of ids for days 0 (pre) and 1 - 5
    FAKE_DAILY_FORM_IDS = (123450..123455).to_a.freeze
    FAKE_FACILITATOR_FORM_ID = 123459
    FAKE_SUBMISSION_ID = 987654
    FAKE_ACADEMIC_YEAR_IDS = (54321...54324).to_a.freeze
    FAKE_CSF_201_FORM_IDS = [201903, 201904].freeze

    setup do
      CDO.stubs(:jotform_forms).returns(
        {
          local_summer: {
            day_0: FAKE_DAILY_FORM_IDS[0],
            day_1: FAKE_DAILY_FORM_IDS[1],
            day_5: FAKE_DAILY_FORM_IDS[5],
            facilitator: FAKE_FACILITATOR_FORM_ID
          },
          academic_year_1: {
            day_1: FAKE_ACADEMIC_YEAR_IDS[0],
            post_workshop: FAKE_ACADEMIC_YEAR_IDS[4],
            facilitator: FAKE_FACILITATOR_FORM_ID
          },
          academic_year_5: {
            day_1: FAKE_ACADEMIC_YEAR_IDS[0],
            day_2: FAKE_ACADEMIC_YEAR_IDS[1],
            post_workshop: FAKE_ACADEMIC_YEAR_IDS[4],
            facilitator: FAKE_FACILITATOR_FORM_ID
          },
          csf: {
            pre201: FAKE_CSF_201_FORM_IDS[0],
            post201: FAKE_CSF_201_FORM_IDS[1]
          }
        }.deep_stringify_keys
      )

      @csf_pre201_form_id = CDO.jotform_forms[CSF_CATEGORY][PRE_DEEPDIVE_SURVEY]
      @csf_pre201_key_params = {
        environment: Rails.env,
        userId: @enrolled_csf201_teacher.id,
        workshopId: @csf201_workshop.id,
        day: 0,
        formId: @csf_pre201_form_id
      }
    end

    test 'daily summer workshop survey returns 404 for days outside of range 0-4' do
      sign_in @enrolled_summer_teacher
      get '/pd/workshop_survey/day/-1'
      assert_response :not_found

      get '/pd/workshop_survey/day/5'
      assert_response :not_found
    end

    test 'daily academic year workshop survey results 404 for days outside of 1' do
      sign_in @enrolled_academic_year_teacher

      get '/pd/workshop_survey/day/0'
      assert_response :not_found

      get '/pd/workshop_survey/day/2'
      assert_response :not_found
    end

    test 'pre-workshop survey displays not enrolled message when not enrolled' do
      sign_in @unenrolled_teacher
      get '/pd/workshop_survey/day/0'
      assert_response :success
      assert_not_enrolled
    end

    test 'pre-workshop survey redirects to thanks when a response exists' do
      create :pd_workshop_daily_survey, pd_workshop: @summer_workshop, user: @enrolled_summer_teacher,
        day: 0, form_id: FAKE_DAILY_FORM_IDS[0]

      sign_in @enrolled_summer_teacher
      get '/pd/workshop_survey/day/0'
      assert_redirected_to action: 'thanks'
    end

    test 'pre-workshop survey displays embedded JotForm when enrolled' do
      submit_redirect = general_submit_redirect(day: 0)
      assert_equal '/pd/workshop_survey/submit', URI.parse(submit_redirect).path

      WorkshopDailySurveyController.view_context_class.any_instance.expects(:embed_jotform).with(
        FAKE_DAILY_FORM_IDS[0],
        {
          environment: 'test',
          userId: @enrolled_summer_teacher.id,
          workshopId: @summer_workshop.id,
          day: 0,
          formId: FAKE_DAILY_FORM_IDS[0],
          sessionId: nil,
          userName: @enrolled_summer_teacher.name,
          userEmail: @enrolled_summer_teacher.email,
          workshopCourse: COURSE_CSP,
          workshopSubject: SUBJECT_TEACHER_CON,
          regionalPartnerName: @regional_partner.name,
          submitRedirect: submit_redirect
        }
      )

      sign_in @enrolled_summer_teacher
      get '/pd/workshop_survey/day/0'
      assert_response :success
    end

    test 'pre-workshop survey reports render to New Relic' do
      NewRelic::Agent.expects(:record_custom_event).with(
        'RenderJotFormView',
        {
          route: 'GET /pd/workshop_survey/day/0',
          form_id: FAKE_DAILY_FORM_IDS[0],
          workshop_course: COURSE_CSP,
          workshop_subject: SUBJECT_TEACHER_CON,
          regional_partner_name: @regional_partner.name
        }
      )

      CDO.stubs(:newrelic_logging).returns(true)
      sign_in @enrolled_summer_teacher
      get '/pd/workshop_survey/day/0'
      assert_response :success
    end

    test 'pre-workshop submit redirect creates a placeholder and redirects to thanks' do
      sign_in @enrolled_summer_teacher

      assert_creates Pd::WorkshopDailySurvey do
        post '/pd/workshop_survey/submit',
          params: general_submit_redirect_params(day: 0).merge(
            submission_id: FAKE_SUBMISSION_ID,
          )

        assert_redirected_to action: 'thanks'
      end

      new_record = Pd::WorkshopDailySurvey.last
      assert new_record.placeholder?
      assert_equal @summer_workshop, new_record.pd_workshop
      assert_equal 0, new_record.day
    end

    test 'daily workshop survey displays not enrolled message when not enrolled' do
      sign_in @unenrolled_teacher
      get '/pd/workshop_survey/day/1'
      assert_response :success
      assert_not_enrolled
    end

    test 'daily workshop survey displays closed message when session attendance is closed' do
      Session.any_instance.expects(:open_for_attendance?).returns(false)

      sign_in @enrolled_summer_teacher
      get '/pd/workshop_survey/day/1'
      assert_response :success
      assert_closed
    end

    test 'daily workshop survey displays no attendance message when session is open but not attended' do
      Session.any_instance.expects(:open_for_attendance?).returns(true)

      sign_in @enrolled_summer_teacher
      get '/pd/workshop_survey/day/1'
      assert_response :success
      assert_no_attendance
    end

    test 'daily workshop survey redirects to first facilitator form when a response exists' do
      Session.any_instance.expects(:open_for_attendance?).returns(true)
      create :pd_attendance, session: @summer_workshop.sessions[0], teacher: @enrolled_summer_teacher, enrollment: @summer_enrollment
      create :pd_workshop_daily_survey, pd_workshop: @summer_workshop, user: @enrolled_summer_teacher,
        day: 1, form_id: FAKE_DAILY_FORM_IDS[1], pd_session: @summer_workshop.sessions[0]

      sign_in @enrolled_summer_teacher
      get '/pd/workshop_survey/day/1'
      assert_redirected_to action: :new_facilitator, session_id: @summer_workshop.sessions[0].id, facilitator_index: 0
    end

    test 'daily summer workshop survey with open session attendance displays embedded JotForm' do
      Session.any_instance.expects(:open_for_attendance?).returns(true)
      create :pd_attendance, session: @summer_workshop.sessions[0], teacher: @enrolled_summer_teacher, enrollment: @summer_enrollment

      submit_redirect = general_submit_redirect(day: 1)
      assert_equal '/pd/workshop_survey/submit', URI.parse(submit_redirect).path

      WorkshopDailySurveyController.view_context_class.any_instance.expects(:embed_jotform).with(
        FAKE_DAILY_FORM_IDS[1],
        {
          environment: 'test',
          userId: @enrolled_summer_teacher.id,
          workshopId: @summer_workshop.id,
          day: 1,
          formId: FAKE_DAILY_FORM_IDS[1],
          sessionId: @summer_workshop.sessions[0].id,
          userName: @enrolled_summer_teacher.name,
          userEmail: @enrolled_summer_teacher.email,
          workshopCourse: COURSE_CSP,
          workshopSubject: SUBJECT_TEACHER_CON,
          regionalPartnerName: @regional_partner.name,
          submitRedirect: submit_redirect
        }
      )

      sign_in @enrolled_summer_teacher
      get '/pd/workshop_survey/day/1'
      assert_response :success
    end

    test 'academic year workshop with open session attendance displays embedded Jotform' do
      Session.any_instance.expects(:open_for_attendance?).returns(true)
      create :pd_attendance, session: @academic_year_workshop.sessions[0], teacher: @enrolled_academic_year_teacher, enrollment: @academic_year_enrollment

      submit_redirect = general_submit_redirect(day: 1, user: @enrolled_academic_year_teacher, workshop: @academic_year_workshop)
      assert_equal '/pd/workshop_survey/submit', URI.parse(submit_redirect).path

      WorkshopDailySurveyController.view_context_class.any_instance.expects(:embed_jotform).with(
        FAKE_ACADEMIC_YEAR_IDS[0],
        {
          environment: 'test',
          userId: @enrolled_academic_year_teacher.id,
          workshopId: @academic_year_workshop.id,
          day: 1,
          formId: FAKE_ACADEMIC_YEAR_IDS[0],
          sessionId: @academic_year_workshop.sessions[0].id,
          userName: @enrolled_academic_year_teacher.name,
          userEmail: @enrolled_academic_year_teacher.email,
          workshopCourse: COURSE_CSP,
          workshopSubject: SUBJECT_CSP_WORKSHOP_1,
          regionalPartnerName: @regional_partner.name,
          submitRedirect: submit_redirect
        }
      )

      sign_in @enrolled_academic_year_teacher
      get '/pd/workshop_survey/day/1'
      assert_response :success
    end

    test 'enrollment code override is used when fetching the workshop for a user' do
      other_academic_workshop = create :pd_workshop, course: COURSE_CSP, subject: SUBJECT_CSP_WORKSHOP_1,
        num_sessions: 1, regional_partner: @regional_partner, facilitators: @facilitators, sessions_from: Date.today + 1.month
      other_enrollment = create :pd_enrollment, :from_user, workshop: other_academic_workshop, user: @enrolled_academic_year_teacher
      create :pd_attendance, session: other_academic_workshop.sessions[0], teacher: @enrolled_academic_year_teacher, enrollment: other_enrollment

      # Same test as above but make sure we use the other workshop instead of @academic_year_workshop
      # because we are using the enrollment code
      submit_redirect = general_submit_redirect(day: 1, user: @enrolled_academic_year_teacher, workshop: other_academic_workshop)
      assert_equal '/pd/workshop_survey/submit', URI.parse(submit_redirect).path

      WorkshopDailySurveyController.view_context_class.any_instance.expects(:embed_jotform).with(
        FAKE_ACADEMIC_YEAR_IDS[0],
        {
          environment: 'test',
          userId: @enrolled_academic_year_teacher.id,
          workshopId: other_academic_workshop.id,
          day: 1,
          formId: FAKE_ACADEMIC_YEAR_IDS[0],
          sessionId: other_academic_workshop.sessions[0].id,
          userName: @enrolled_academic_year_teacher.name,
          userEmail: @enrolled_academic_year_teacher.email,
          workshopCourse: COURSE_CSP,
          workshopSubject: SUBJECT_CSP_WORKSHOP_1,
          regionalPartnerName: @regional_partner.name,
          submitRedirect: submit_redirect
        }
      )

      sign_in @enrolled_academic_year_teacher
      get "/pd/workshop_survey/day/1?enrollmentCode=#{other_enrollment.code}"
      assert_response :success
    end

    test 'daily workshop submit redirect creates placeholder and redirects to first facilitator form' do
      sign_in @enrolled_summer_teacher

      assert_creates Pd::WorkshopDailySurvey do
        post '/pd/workshop_survey/submit',
          params: general_submit_redirect_params(day: 1).merge(
            submission_id: FAKE_SUBMISSION_ID,
          )

        assert_redirected_to action: :new_facilitator, session_id: @summer_workshop.sessions[0].id, facilitator_index: 0
      end

      new_record = Pd::WorkshopDailySurvey.last
      assert new_record.placeholder?
      assert_equal @summer_workshop, new_record.pd_workshop
      assert_equal 1, new_record.day
    end

    test 'academic year workshop submit redirect creates placeholder and redirects to the first facilitator form' do
      sign_in @enrolled_academic_year_teacher

      assert_creates Pd::WorkshopDailySurvey do
        params = general_submit_redirect_params(day: 1, user: @enrolled_academic_year_teacher, workshop: @academic_year_workshop).merge(
          submission_id: FAKE_SUBMISSION_ID,
        )

        post '/pd/workshop_survey/submit', params: params

        assert_redirected_to action: :new_facilitator, session_id: @academic_year_workshop.sessions[0].id, facilitator_index: 0
      end

      new_record = Pd::WorkshopDailySurvey.last
      assert new_record.placeholder?
      assert_equal @academic_year_workshop, new_record.pd_workshop
      assert_equal 1, new_record.day
    end

    test 'facilitator specific survey displays closed message when session attendance is closed' do
      Session.any_instance.expects(:open_for_attendance?).returns(false)

      sign_in @enrolled_summer_teacher
      get "/pd/workshop_survey/facilitators/#{@summer_workshop.sessions[0].id}/0"
      assert_response :success
      assert_closed
    end

    test 'facilitator specific survey displays no attendance message when session is open but not attended' do
      Session.any_instance.expects(:open_for_attendance?).returns(true)

      sign_in @enrolled_summer_teacher
      get "/pd/workshop_survey/facilitators/#{@summer_workshop.sessions[0].id}/0"
      assert_response :success
      assert_no_attendance
    end

    test 'facilitator specific survey redirects to next facilitator when response exists' do
      Session.any_instance.expects(:open_for_attendance?).returns(true)
      create :pd_attendance, session: @summer_workshop.sessions[0], teacher: @enrolled_summer_teacher, enrollment: @summer_enrollment
      create :pd_workshop_facilitator_daily_survey, pd_workshop: @summer_workshop, user: @enrolled_summer_teacher,
        day: 1, form_id: FAKE_FACILITATOR_FORM_ID, pd_session: @summer_workshop.sessions[0], facilitator: @facilitators[0]

      sign_in @enrolled_summer_teacher
      get "/pd/workshop_survey/facilitators/#{@summer_workshop.sessions[0].id}/0"
      assert_redirected_to action: :new_facilitator, session_id: @summer_workshop.sessions[0].id, facilitator_index: 1
    end

    test 'last facilitator specific survey redirects to thanks when response exists' do
      Session.any_instance.expects(:open_for_attendance?).returns(true)
      create :pd_attendance, session: @summer_workshop.sessions[0], teacher: @enrolled_summer_teacher, enrollment: @summer_enrollment
      create :pd_workshop_facilitator_daily_survey, pd_workshop: @summer_workshop, user: @enrolled_summer_teacher,
        day: 1, form_id: FAKE_FACILITATOR_FORM_ID, pd_session: @summer_workshop.sessions[0], facilitator: @facilitators[1]

      sign_in @enrolled_summer_teacher
      get "/pd/workshop_survey/facilitators/#{@summer_workshop.sessions[0].id}/1"
      assert_redirected_to '/pd/workshop_survey/thanks'
    end

    test 'facilitator specific survey with open session attendance displays embedded JotForm' do
      Session.any_instance.expects(:open_for_attendance?).returns(true)
      create :pd_attendance, session: @summer_workshop.sessions[0], teacher: @enrolled_summer_teacher, enrollment: @summer_enrollment

      submit_redirect = facilitator_submit_redirect(day: 1, facilitator_index: 0)
      assert_equal '/pd/workshop_survey/facilitators/submit', URI.parse(submit_redirect).path

      WorkshopDailySurveyController.view_context_class.any_instance.expects(:embed_jotform).with(
        FAKE_FACILITATOR_FORM_ID,
        {
          environment: 'test',
          userId: @enrolled_summer_teacher.id,
          sessionId: @summer_workshop.sessions[0].id,
          facilitatorId: @facilitators[0].id,
          facilitatorIndex: 0,
          formId: FAKE_FACILITATOR_FORM_ID,
          workshopId: @summer_workshop.id,
          userName: @enrolled_summer_teacher.name,
          userEmail: @enrolled_summer_teacher.email,
          workshopCourse: COURSE_CSP,
          workshopSubject: SUBJECT_TEACHER_CON,
          regionalPartnerName: @regional_partner.name,
          day: 1,
          facilitatorPosition: 1,
          facilitatorName: @facilitators[0].name,
          numFacilitators: 2,
          submitRedirect: submit_redirect
        }
      )

      sign_in @enrolled_summer_teacher
      get "/pd/workshop_survey/facilitators/#{@summer_workshop.sessions[0].id}/0"
      assert_response :success
    end

    test 'facilitator specific survey reports render to New Relic' do
      NewRelic::Agent.expects(:record_custom_event).with(
        'RenderJotFormView',
        {
          route: "GET /pd/workshop_survey/facilitators/#{@summer_workshop.sessions[0].id}/0",
          form_id: FAKE_FACILITATOR_FORM_ID,
          workshop_course: COURSE_CSP,
          workshop_subject: SUBJECT_TEACHER_CON,
          regional_partner_name: @regional_partner.name
        }
      )

      CDO.stubs(:newrelic_logging).returns(true)

      Session.any_instance.expects(:open_for_attendance?).returns(true)
      create :pd_attendance, session: @summer_workshop.sessions[0], teacher: @enrolled_summer_teacher, enrollment: @summer_enrollment
      sign_in @enrolled_summer_teacher
      get "/pd/workshop_survey/facilitators/#{@summer_workshop.sessions[0].id}/0"
      assert_response :success
    end

    test 'facilitator specific submit redirect creates placeholder and redirects to next facilitator form' do
      sign_in @enrolled_summer_teacher

      assert_creates Pd::WorkshopFacilitatorDailySurvey do
        post '/pd/workshop_survey/facilitators/submit',
          params: facilitator_submit_redirect_params(day: 1, facilitator_index: 0).merge(
            submission_id: FAKE_SUBMISSION_ID,
          )

        assert_redirected_to action: :new_facilitator, session_id: @summer_workshop.sessions[0].id, facilitator_index: 1
      end

      new_record = Pd::WorkshopFacilitatorDailySurvey.last
      assert new_record.placeholder?
      assert_equal @summer_workshop, new_record.pd_workshop
      assert_equal 1, new_record.day
      assert_equal @facilitators[0], new_record.facilitator
    end

    test 'facilitator specific submit redirect creates placeholder and redirects to thanks for last facilitator' do
      sign_in @enrolled_summer_teacher

      assert_creates Pd::WorkshopFacilitatorDailySurvey do
        post '/pd/workshop_survey/facilitators/submit',
          params: facilitator_submit_redirect_params(day: 1, facilitator_index: 1).merge(
            submission_id: FAKE_SUBMISSION_ID,
          )

        assert_redirected_to action: :thanks
      end

      new_record = Pd::WorkshopFacilitatorDailySurvey.last
      assert new_record.placeholder?
      assert_equal @summer_workshop, new_record.pd_workshop
      assert_equal 1, new_record.day
      assert_equal @facilitators[1], new_record.facilitator
    end

    test 'facilitator specific submit for 2-day academic redirects to thanks for day 1' do
      sign_in @enrolled_two_day_academic_year_teacher

      assert_creates Pd::WorkshopFacilitatorDailySurvey do
        post '/pd/workshop_survey/facilitators/submit',
          params: facilitator_submit_redirect_params(day: 1, facilitator_index: 1).deep_merge(
            submission_id: FAKE_SUBMISSION_ID,
            key: {
              userId: @enrolled_two_day_academic_year_teacher.id,
              sessionId: @two_day_academic_year_workshop.sessions[0].id
            }
          )

        assert_redirected_to action: :thanks
      end

      new_record = Pd::WorkshopFacilitatorDailySurvey.last
      assert new_record.placeholder?
      assert_equal @two_day_academic_year_workshop, new_record.pd_workshop
      assert_equal 1, new_record.day
      assert_equal @facilitators[1], new_record.facilitator
    end

    test 'facilitator specific submit for 2-day academic redirects to post for day 2' do
      sign_in @enrolled_two_day_academic_year_teacher

      assert_creates Pd::WorkshopFacilitatorDailySurvey do
        post '/pd/workshop_survey/facilitators/submit',
          params: facilitator_submit_redirect_params(day: 2, facilitator_index: 1).deep_merge(
            submission_id: FAKE_SUBMISSION_ID,
            key: {
              userId: @enrolled_two_day_academic_year_teacher.id,
              sessionId: @two_day_academic_year_workshop.sessions[1].id
            }
          )

        assert_redirected_to action: :new_post, enrollment_code: @two_day_academic_year_enrollment.code
      end

      new_record = Pd::WorkshopFacilitatorDailySurvey.last
      assert new_record.placeholder?
      assert_equal @two_day_academic_year_workshop, new_record.pd_workshop
      assert_equal 2, new_record.day
      assert_equal @facilitators[1], new_record.facilitator
    end

    test 'facilitator specific submit for 1-day academic redirects to post for day 1' do
      sign_in @enrolled_academic_year_teacher

      assert_creates Pd::WorkshopFacilitatorDailySurvey do
        post '/pd/workshop_survey/facilitators/submit',
          params: facilitator_submit_redirect_params(day: 1, facilitator_index: 1).deep_merge(
            submission_id: FAKE_SUBMISSION_ID,
            key: {
              userId: @enrolled_academic_year_teacher.id,
              sessionId: @academic_year_workshop.sessions[0].id
            }
          )

        assert_redirected_to action: :new_post, enrollment_code: @academic_year_enrollment.code
      end

      new_record = Pd::WorkshopFacilitatorDailySurvey.last
      assert new_record.placeholder?
      assert_equal @academic_year_workshop, new_record.pd_workshop
      assert_equal 1, new_record.day
      assert_equal @facilitators[1], new_record.facilitator
    end

    test 'post workshop survey without a valid enrollment code renders 404' do
      sign_in @enrolled_summer_teacher
      get '/pd/workshop_survey/post/invalid_enrollment_code'
      assert_response :not_found
    end

    test 'post workshop survey renders embedded JotForm' do
      create :pd_attendance, session: @summer_workshop.sessions[4], teacher: @enrolled_summer_teacher, enrollment: @summer_enrollment

      submit_redirect = general_submit_redirect(day: 5, enrollment_code: @summer_enrollment.code)
      assert_equal '/pd/workshop_survey/submit', URI.parse(submit_redirect).path

      WorkshopDailySurveyController.view_context_class.any_instance.expects(:embed_jotform).with(
        FAKE_DAILY_FORM_IDS[5],
        {
          environment: 'test',
          userId: @enrolled_summer_teacher.id,
          workshopId: @summer_workshop.id,
          day: 5,
          formId: FAKE_DAILY_FORM_IDS[5],
          sessionId: @summer_workshop.sessions[4].id,
          userName: @enrolled_summer_teacher.name,
          userEmail: @enrolled_summer_teacher.email,
          workshopCourse: COURSE_CSP,
          workshopSubject: SUBJECT_TEACHER_CON,
          regionalPartnerName: @regional_partner.name,
          submitRedirect: submit_redirect,
          enrollmentCode: @summer_enrollment.code
        }
      )

      sign_in @enrolled_summer_teacher
      get "/pd/workshop_survey/post/#{@summer_enrollment.code}"
      assert_response :success
    end

    test 'post workshop for summer submit redirect creates a placeholder and redirects to thanks' do
      sign_in @enrolled_summer_teacher

      assert_creates Pd::WorkshopDailySurvey do
        post '/pd/workshop_survey/submit',
          params: general_submit_redirect_params(day: 5).merge(
            submission_id: FAKE_SUBMISSION_ID,
          )

        assert_redirected_to action: :new_facilitator, session_id: @summer_workshop.sessions[4].id, facilitator_index: 0
      end

      new_record = Pd::WorkshopDailySurvey.last
      assert new_record.placeholder?
      assert_equal @summer_workshop, new_record.pd_workshop
      assert_equal 5, new_record.day
    end

    test 'post workshop submit redirects to thanks academic year workshops' do
      sign_in @enrolled_academic_year_teacher

      assert_creates Pd::WorkshopDailySurvey do
        params = general_submit_redirect_params(
          day: 1,
          user: @enrolled_academic_year_teacher,
          workshop: @academic_year_workshop,
          enrollment_code: @academic_year_enrollment.code
        ).merge submission_id: FAKE_SUBMISSION_ID

        params[:key][:formId] = FAKE_ACADEMIC_YEAR_IDS[1]
        post '/pd/workshop_survey/submit', params: params

        assert_redirected_to action: :thanks
      end

      new_record = Pd::WorkshopDailySurvey.last
      assert new_record.placeholder?
      assert_equal @academic_year_workshop, new_record.pd_workshop
      assert_equal 1, new_record.day
      assert_equal FAKE_ACADEMIC_YEAR_IDS[1], new_record.form_id
    end

    test 'csf pre-201 survey: unenrolled user sees 404 msg' do
      sign_in @unenrolled_teacher
      get '/pd/workshop_survey/csf/pre201'

      assert_response :success
      assert_not_enrolled
    end

    test 'csf pre-201 survey: user enrolls in ended workshop sees too late msg' do
      # teacher = create :teacher
      # ended_workshop = create :pd_ended_workshop, course: COURSE_CSF, subject: SUBJECT_CSF_201
      # create :pd_enrollment, :from_user, user: teacher, workshop: ended_workshop

      assert @csf201_workshop.state != STATE_ENDED
      @csf201_workshop.start!
      @csf201_workshop.end!
      @csf201_workshop.reload
      assert @csf201_workshop.state == STATE_ENDED

      sign_in @enrolled_csf201_teacher
      get '/pd/workshop_survey/csf/pre201'

      assert_response :success
      assert_closed
    end

    test 'csf pre-201 survey: user enrolls in unended workshop sees survey' do
      # TODO: test transactional, end a global csf workshop here and makesure it's rolled back
      # teacher = create :teacher
      # not_started_workshop = create :pd_workshop,
      #   course: COURSE_CSF, subject: SUBJECT_CSF_201, regional_partner: @regional_partner, num_sessions: 1
      # create :pd_enrollment, user: teacher, workshop: not_started_workshop

      # @csf_pre201_form_id = CDO.jotform_forms[CSF_CATEGORY][PRE_201_SURVEY]
      # key_params = {
      #   environment: 'test',
      #   userId: teacher.id,
      #   workshopId: not_started_workshop.id,
      #   day: 0,
      #   formId: @csf_pre201_form_id,
      # }

      submit_redirect = url_for(controller: 'pd/workshop_daily_survey',
        action: 'submit_general',
        params: {key: @csf_pre201_key_params}
      )

      # TODO: instead of equality comparison, just varity the key fields in the contract is sent to jotform e.g. userid, formid, submitredirect
      WorkshopDailySurveyController.view_context_class.any_instance.expects(:embed_jotform).with(
        @csf_pre201_form_id,
        @csf_pre201_key_params.merge(
          userName: @enrolled_csf201_teacher.name,
          userEmail: @enrolled_csf201_teacher.email,
          submitRedirect: submit_redirect
        )
      )

      sign_in @enrolled_csf201_teacher
      get '/pd/workshop_survey/csf/pre201'

      assert_response :success
    end

    test 'csf pre-201 survey: reports survey render to New Relic' do
      # teacher = create :teacher
      # not_started_workshop = create :pd_workshop,
      #   course: COURSE_CSF, subject: SUBJECT_CSF_201, regional_partner: @regional_partner, num_sessions: 1
      # create :pd_enrollment, user: teacher, workshop: not_started_workshop

      CDO.stubs(:newrelic_logging).returns(true)
      NewRelic::Agent.expects(:record_custom_event).with(
        'RenderJotFormView',
        {
          route: 'GET /pd/workshop_survey/csf/pre201',
          form_id: @csf_pre201_form_id,
          workshop_course: COURSE_CSF,
          workshop_subject: SUBJECT_CSF_201,
          regional_partner_name: @regional_partner.name
        }
      )

      sign_in @enrolled_csf201_teacher
      get '/pd/workshop_survey/csf/pre201'

      assert_response :success
    end

    test 'csf pre-201 survey: survey submission creates a placeholder record and redirects to thanks page' do
      # teacher = create :teacher
      # not_started_workshop = create :pd_workshop,
      #   course: COURSE_CSF, subject: SUBJECT_CSF_201, regional_partner: @regional_partner, num_sessions: 1
      # create :pd_enrollment, user: teacher, workshop: not_started_workshop

      # @csf_pre201_form_id = CDO.jotform_forms[CSF_CATEGORY][PRE_201_SURVEY]
      # key_params = {
      #   environment: 'test',
      #   userId: teacher.id,
      #   workshopId: not_started_workshop.id,
      #   day: 0,
      #   formId: @csf_pre201_form_id
      # }

      refute(WorkshopDailySurvey.response_exists?(
        user_id: @csf_pre201_key_params[:userId],
        pd_workshop_id: @csf_pre201_key_params[:workshopId],
        day: @csf_pre201_key_params[:day],
        form_id: @csf_pre201_key_params[:formId]
        )
      )

      sign_in @enrolled_csf201_teacher
      post '/pd/workshop_survey/submit',
        params: {key: @csf_pre201_key_params}.merge(submission_id: FAKE_SUBMISSION_ID)

      assert(WorkshopDailySurvey.response_exists?(
        user_id: @csf_pre201_key_params[:userId],
        pd_workshop_id: @csf_pre201_key_params[:workshopId],
        day: @csf_pre201_key_params[:day],
        form_id: @csf_pre201_key_params[:formId],
        submission_id: FAKE_SUBMISSION_ID
        )
      )
      assert_redirected_to action: 'thanks'
    end

    test 'csf pre-201 survey: user can not submit survey twice' do
      # teacher = create :teacher
      # not_started_workshop = create :pd_workshop,
      #   course: COURSE_CSF, subject: SUBJECT_CSF_201, regional_partner: @regional_partner, num_sessions: 1
      # create :pd_enrollment, user: teacher, workshop: not_started_workshop
      # key_params = {
      #   environment: 'test',
      #   userId: @enrolled_csf201_teacher.id,
      #   workshopId: @csf201_workshop.id,
      #   day: 0,
      #   formId: @csf_pre201_form_id
      # }

      WorkshopDailySurvey.create_placeholder!(
        user_id: @csf_pre201_key_params[:userId],
        pd_workshop_id: @csf_pre201_key_params[:workshopId],
        day: @csf_pre201_key_params[:day],
        form_id: @csf_pre201_key_params[:formId],
        submission_id: FAKE_SUBMISSION_ID
      )

      sign_in @enrolled_csf201_teacher
      get '/pd/workshop_survey/csf/pre201'

      WorkshopDailySurveyController.view_context_class.any_instance.expects(:embed_jotform).never
      assert_redirected_to action: 'thanks'
    end

    test 'thanks displays thanks message' do
      sign_in @enrolled_summer_teacher
      get '/pd/workshop_survey/thanks'
      assert_response :success
      assert_thanks
    end

    private

    def assert_thanks
      assert_select 'h1', text: 'Thank you for submitting today’s survey.'
    end

    def assert_not_enrolled
      assert_select 'h1', text: 'Not Enrolled'
      assert_select 'p', text: 'You need to be enrolled in a workshop before completing this survey.'
    end

    def assert_closed
      assert_select 'h1', text: 'The survey has closed'
      assert_select 'p', text: /The survey for today’s session of your workshop is now closed\./
    end

    def assert_no_attendance
      assert_select 'h1', text: 'No Attendance'
      assert_select 'p', text:
        'You need to be marked as attended for today’s session of your workshop before you can complete this survey.'
    end

    def general_submit_redirect(day:, user: @enrolled_summer_teacher, workshop: @summer_workshop, enrollment_code: nil)
      url_for(controller: 'pd/workshop_daily_survey', action: 'submit_general',
        params: general_submit_redirect_params(day: day, user: user, workshop: workshop, enrollment_code: enrollment_code)
      )
    end

    def general_submit_redirect_params(day:, user: @enrolled_summer_teacher, workshop: @summer_workshop, enrollment_code: nil)
      params = {
        key: {
          environment: 'test',
          userId: user.id,
          workshopId: workshop.id,
          day: day,
          formId: workshop.summer? ? FAKE_DAILY_FORM_IDS[day] : FAKE_ACADEMIC_YEAR_IDS[day - 1],
          sessionId: day == 0 ? nil : workshop.sessions[day - 1].id
        }
      }

      params[:key][:enrollmentCode] = enrollment_code if enrollment_code

      params
    end

    def facilitator_submit_redirect(day:, facilitator_index:)
      url_for(controller: 'pd/workshop_daily_survey', action: 'submit_facilitator',
        params: facilitator_submit_redirect_params(day: day, facilitator_index: facilitator_index)
      )
    end

    def facilitator_submit_redirect_params(day:, facilitator_index:)
      {
        key: {
          environment: 'test',
          userId: @enrolled_summer_teacher.id,
          sessionId: @summer_workshop.sessions[day - 1].id,
          day: day,
          facilitatorId: @facilitators[facilitator_index].id,
          facilitatorIndex: facilitator_index,
          formId: FAKE_FACILITATOR_FORM_ID,
        }
      }
    end
  end
end
