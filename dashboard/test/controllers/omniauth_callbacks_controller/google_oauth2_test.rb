require 'test_helper'
require_relative './utils'

module OmniauthCallbacksControllerTests
  #
  # Tests over Google sign-up and sign-in stories
  #
  class GoogleOAuth2Test < ActionDispatch::IntegrationTest
    include OmniauthCallbacksControllerTests::Utils

    setup do
      stub_firehose

      # Force split-test to control group (override in tests over experiment)
      SignUpTracking.stubs(:split_test_percentage).returns(0)
    end

    test "student sign-up" do
      auth_hash = mock_oauth

      get '/users/sign_up'
      sign_in_through_google
      assert_redirected_to '/users/sign_up'
      follow_redirect!
      assert_template partial: '_sign_up'

      assert_creates(User) {finish_sign_up auth_hash, User::TYPE_STUDENT}
      assert_redirected_to '/'
      follow_redirect!
      assert_redirected_to '/home'
      assert_equal I18n.t('devise.registrations.signed_up'), flash[:notice]

      created_user = User.find signed_in_user_id
      assert_valid_student created_user, expected_email: auth_hash.info.email
      assert_credentials auth_hash, created_user

      assert_sign_up_tracking(
        'v2-control',
        %w(
          load-sign-up-page
          google_oauth2-sign-up-error
          google_oauth2-sign-up-success
        )
      )
    ensure
      created_user&.destroy!
    end

    test "teacher sign-up" do
      auth_hash = mock_oauth

      get '/users/sign_up'
      sign_in_through_google
      assert_redirected_to '/users/sign_up'
      follow_redirect!
      assert_template partial: '_sign_up'

      assert_creates(User) {finish_sign_up auth_hash, User::TYPE_TEACHER}
      assert_redirected_to '/home'
      assert_equal I18n.t('devise.registrations.signed_up'), flash[:notice]

      created_user = User.find signed_in_user_id
      assert_valid_teacher created_user, expected_email: auth_hash.info.email
      assert_credentials auth_hash, created_user

      assert_sign_up_tracking(
        'v2-control',
        %w(
          load-sign-up-page
          google_oauth2-sign-up-error
          google_oauth2-sign-up-success
        )
      )
    ensure
      created_user&.destroy!
    end

    test "student sign-up (new sign-up flow)" do
      auth_hash = mock_oauth
      SignUpTracking.stubs(:split_test_percentage).returns(100)

      get '/users/sign_up'
      sign_in_through_google
      assert_redirected_to '/users/sign_up'
      follow_redirect!
      assert_template partial: '_finish_sign_up'

      assert_creates(User) {finish_sign_up auth_hash, User::TYPE_STUDENT}
      assert_redirected_to '/'
      follow_redirect!
      assert_redirected_to '/home'
      assert_equal I18n.t('devise.registrations.signed_up'), flash[:notice]

      created_user = User.find signed_in_user_id
      assert_valid_student created_user, expected_email: auth_hash.info.email
      assert_credentials auth_hash, created_user

      assert_sign_up_tracking(
        'v2-finish-sign-up',
        %w(
          load-sign-up-page
          google_oauth2-sign-up-success
        )
      )
    ensure
      created_user&.destroy!
    end

    test "teacher sign-up (new sign-up flow)" do
      auth_hash = mock_oauth
      SignUpTracking.stubs(:split_test_percentage).returns(100)

      get '/users/sign_up'
      sign_in_through_google
      assert_redirected_to '/users/sign_up'
      follow_redirect!
      assert_template partial: '_finish_sign_up'

      assert_creates(User) {finish_sign_up auth_hash, User::TYPE_TEACHER}
      assert_redirected_to '/home'
      assert_equal I18n.t('devise.registrations.signed_up'), flash[:notice]

      created_user = User.find signed_in_user_id
      assert_valid_teacher created_user, expected_email: auth_hash.info.email
      assert_credentials auth_hash, created_user

      assert_sign_up_tracking(
        'v2-finish-sign-up',
        %w(
          load-sign-up-page
          google_oauth2-sign-up-success
        )
      )
    ensure
      created_user&.destroy!
    end

    test "student sign-in" do
      auth_hash = mock_oauth

      student = create(:student, :unmigrated_google_sso, uid: auth_hash.uid)

      get '/users/sign_in'
      sign_in_through_google
      assert_redirected_to '/'
      follow_redirect!
      assert_redirected_to '/home'
      assert_equal I18n.t('auth.signed_in'), flash[:notice]

      assert_equal student.id, signed_in_user_id
      student.reload
      assert_credentials auth_hash, student

      refute_sign_up_tracking
    end

    test "teacher sign-in" do
      auth_hash = mock_oauth

      teacher = create(:teacher, :unmigrated_google_sso, uid: auth_hash.uid)

      get '/users/sign_in'
      sign_in_through_google
      assert_redirected_to '/home'
      assert_equal I18n.t('auth.signed_in'), flash[:notice]

      assert_equal teacher.id, signed_in_user_id
      teacher.reload
      assert_credentials auth_hash, teacher

      refute_sign_up_tracking
    end

    private

    # @return [OmniAuth::AuthHash] that will be passed to the callback when test-mode OAuth is invoked
    def mock_oauth
      mock_oauth_for AuthenticationOption::GOOGLE, generate_auth_hash(
        provider: AuthenticationOption::GOOGLE,
        refresh_token: 'fake-refresh-token'
      )
    end

    # The user signs in through Google, which hits the oauth callback
    # and redirects to something else: homepage, finish_sign_up, etc.
    def sign_in_through_google
      sign_in_through AuthenticationOption::GOOGLE
    end

    # Skip firehose logging for these tests
    # Instead record the sequence of events logged, for easy validation in test cases.
    def stub_firehose
      @firehose_records = []
      FirehoseClient.instance.stubs(:put_record).with do |args|
        @firehose_records << args
        true
      end
    end

    def assert_sign_up_tracking(expected_study_group, expected_events)
      study_records = @firehose_records.select {|e| e[:study] == SignUpTracking::STUDY_NAME}
      study_groups = study_records.map {|e| e[:study_group]}.uniq.compact
      study_events = study_records.map {|e| e[:event]}
      assert_equal [expected_study_group], study_groups
      assert_equal expected_events, study_events
    end

    def refute_sign_up_tracking
      study_records = @firehose_records.select {|e| e[:study] == SignUpTracking::STUDY_NAME}
      assert_empty study_records
    end
  end
end
