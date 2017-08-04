import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import HeaderBanner from '../HeaderBanner';
import ContentContainer from '../ContentContainer';
import UiTips from '@cdo/apps/templates/studioHomepages/UiTips';
import FindLocalClassBanner from './FindLocalClassBanner';
import {
  CourseBlocksHoc,
  CourseBlocksAll
} from './CourseBlocks';
import CourseBlocksTools from './CourseBlocksTools';
import CourseBlocksGradeBands from './CourseBlocksGradeBands';
import ProtectedStatefulDiv from '../ProtectedStatefulDiv';
import Button from '@cdo/apps/templates/Button';
import i18n from "@cdo/locale";

/**
 * Though named Courses, this component represents a collection of courses and/or
 * scripts, refered to collectively as "assignables". These come from sections
 * the user is in, or from courses/scripts they have recently made progress in.
 * The component is only used on the /courses page, and also does some additional
 * DOM manipulation on mount.
 */
const Courses = React.createClass({
  propTypes: {
    isEnglish: React.PropTypes.bool.isRequired,
    isTeacher: React.PropTypes.bool.isRequired,
    isSignedOut: React.PropTypes.bool.isRequired,
    linesCount: React.PropTypes.string.isRequired,
    studentsCount: React.PropTypes.string.isRequired,
    codeOrgUrlPrefix: React.PropTypes.string.isRequired,
    showInitialTips: React.PropTypes.bool.isRequired,
    userId: React.PropTypes.number,
    isRtl: React.PropTypes.bool.isRequired
  },

  componentDidMount() {
    // The components used here are implemented in legacy HAML/CSS rather than React.
    $('.courseexplorer').appendTo(ReactDOM.findDOMNode(this.refs.courseExplorer)).show();
    $('#flashes').appendTo(ReactDOM.findDOMNode(this.refs.flashes)).show();
  },

  render() {
    const { isEnglish, isTeacher, codeOrgUrlPrefix, isSignedOut, userId, showInitialTips, isRtl } = this.props;
    const headingText = isSignedOut ? i18n.coursesCodeStudio() : i18n.courses();
    const subHeadingText = i18n.coursesHeadingSubText(
      {linesCount: this.props.linesCount, studentsCount: this.props.studentsCount}
    );
    const headingDescription = isSignedOut ? i18n.coursesHeadingDescription() : null;

    return (
      <div>
        <HeaderBanner
          headingText={headingText}
          subHeadingText={subHeadingText}
          description={headingDescription}
          short={!isSignedOut}
        >
          {isSignedOut && (
            <Button
              href= "/users/sign_up"
              color={Button.ButtonColor.gray}
              text={i18n.createAccount()}
            />
          )}
        </HeaderBanner>

        <ProtectedStatefulDiv
          ref="flashes"
        />

        {/* English, teacher */}
        {(isEnglish && isTeacher) && (
          <div>

            {(!isSignedOut &&
              <UiTips
                userId={userId}
                tipId={"teacher_courses"}
                showInitialTips={showInitialTips}
                tips={
                  [
                    {
                      type: "initial",
                      position: {top: 0, left: 0, position: "relative"},
                      text: i18n.coursesUiTipsTeacherCourses(),
                      arrowDirection: "down",
                      scrollTo: ".courseexplorer"
                    }
                  ]}
              />
            )}

            <div>
              <ContentContainer
                heading={i18n.courseExplorerHeading()}
                description={i18n.courseExplorerDescription()}
                isRtl={isRtl}
              >
                <ProtectedStatefulDiv ref="courseExplorer"/>
              </ContentContainer>

              <CourseBlocksGradeBands
                isEnglish={isEnglish}
                isRtl={isRtl}
                codeOrgUrlPrefix={codeOrgUrlPrefix}
              />

              <ContentContainer
                heading={i18n.teacherCourseHoc()}
                description={i18n.teacherCourseHocDescription()}
                isRtl={isRtl}
                linkText={i18n.teacherCourseHocLinkText()}
                link={`${codeOrgUrlPrefix}/hourofcode/overview`}
                showLink={true}
              >
                <CourseBlocksHoc rowCount={1}/>
              </ContentContainer>

              <CourseBlocksTools
                isEnglish={isEnglish}
                isRtl={isRtl}
                codeOrgUrlPrefix={codeOrgUrlPrefix}
              />
            </div>
          </div>
        )}

        {/* English, student.  (Also shown when signed out) */}
        {(isEnglish && !isTeacher) && (
          <div>
            <CourseBlocksGradeBands
              isEnglish={isEnglish}
              isRtl={isRtl}
              codeOrgUrlPrefix={codeOrgUrlPrefix}
            />

            <ContentContainer
              heading={i18n.teacherCourseHoc()}
              description={i18n.teacherCourseHocDescription()}
              isRtl={isRtl}
              linkText={i18n.teacherCourseHocLinkText()}
              link={`${codeOrgUrlPrefix}/learn`}
            >
              <CourseBlocksHoc rowCount={1}/>
            </ContentContainer>

            <FindLocalClassBanner
              codeOrgUrlPrefix={codeOrgUrlPrefix}
              isRtl={isRtl}
            />
          </div>
        )}

        {/* Non-English */}
        {(!isEnglish) && (
          <CourseBlocksAll
            isEnglish={isEnglish}
            isRtl={isRtl}
            codeOrgUrlPrefix={codeOrgUrlPrefix}
          />
        )}
      </div>
    );
  }
});

export default Courses;
