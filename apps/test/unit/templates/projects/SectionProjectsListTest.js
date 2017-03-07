import React from 'react';
import SectionProjectsList from '@cdo/apps/templates/projects/SectionProjectsList';
import {COLUMNS} from '@cdo/apps/templates/projects/ProjectsList';
import {mount} from 'enzyme';
import {expect} from '../../../util/configuredChai';

const STUB_PROJECTS_DATA = [
  {
    channel: 'ABCDEFGHIJKLM01234',
    name: 'Antelope Freeway',
    studentName: 'Alice',
    type: 'applab',
    updatedAt: '2016-12-31T23:59:59.999-08:00'
  },
  {
    channel: 'AAAABBBBCCCCDDDDEE',
    name: 'Cats and Kittens',
    studentName: 'Charlie',
    type: 'weblab',
    updatedAt: '2016-11-30T00:00:00.001-08:00'
  },
  {
    channel: 'NOPQRSTUVWXYZ567879',
    name: 'Batyote',
    studentName: 'Bob',
    type: 'gamelab',
    updatedAt: '2017-01-01T00:00:00.001-08:00'
  },
  {
    channel: 'VVVVWWWWXXXXYYYYZZ',
    name: 'Another App',
    studentName: 'Alice',
    type: 'applab',
    updatedAt: '2016-10-29T00:00:00.001-08:00'
  },
];

const STUDIO_URL_PREFIX = '//foo-studio.code.org';

/**
 * @param {HTMLTableRowElement} rowElement HTML row element in the projects list table
 * @param {string} projectName Expected project name
 * @param {string} studentName Expected student name
 * @param {string} appType Expected app type (App Lab, Game Lab, etc)
 * @param {string} lastEdited Expected last edited date (Month DD, YYYY). Note that this
 *   format is used only in unit tests due to incorrect date formatting in PhantomJS.
 *   The desired date format which we will show in all browsers is MM/DD/YYYY.
 */
function assertRowContents(rowElement, projectName, studentName, appType, lastEdited) {
  expect(rowElement.childNodes[COLUMNS.PROJECT_NAME].innerText).to.equal(projectName);
  expect(rowElement.childNodes[COLUMNS.STUDENT_NAME].innerText).to.equal(studentName);
  expect(rowElement.childNodes[COLUMNS.APP_TYPE].innerText).to.equal(appType);
  // Temporarily comment out this line to make tests pass locally in Chrome
  expect(rowElement.childNodes[COLUMNS.LAST_EDITED].innerText).to.equal(lastEdited);
}

describe('SectionProjectsList', () => {
  let root;

  beforeEach(() => {
    root = mount(
      <SectionProjectsList
        projectsData={STUB_PROJECTS_DATA}
        studioUrlPrefix={STUDIO_URL_PREFIX}
      />
    );
  });

  it('initially shows all projects, most recently edited first', () => {
    const rows = root.find('tr');
    expect(rows).to.have.length(5);
    assertRowContents(rows.nodes[0], 'Project Name', 'Student Name', 'Type', 'Last Edited');
    assertRowContents(rows.nodes[1], 'Batyote', 'Bob', 'Game Lab', 'January 1, 2017');
    assertRowContents(rows.nodes[2], 'Antelope Freeway', 'Alice', 'App Lab', 'December 31, 2016');
    assertRowContents(rows.nodes[3], 'Cats and Kittens', 'Charlie', 'Web Lab', 'November 30, 2016');
    assertRowContents(rows.nodes[4], 'Another App', 'Alice', 'App Lab', 'October 29, 2016');
  });

  it('shows the correct list of students in the student filter dropdown', () => {
    const options = root.find('option');
    expect(options).to.have.length(4);
    expect(options.nodes[0].innerText).to.equal('All');
    expect(options.nodes[1].innerText).to.equal('Alice');
    expect(options.nodes[2].innerText).to.equal('Bob');
    expect(options.nodes[3].innerText).to.equal('Charlie');

    const select = root.find('select');
    expect(select.nodes[0].value).to.equal('_all_students');
  });

  it('filters projects when a student is selected from the dropdown', () => {
    const select = root.find('select');
    select.simulate('change', {target: {value: 'Alice'}});
    expect(select.nodes[0].value).to.equal('Alice');

    const rows = root.find('tr');
    expect(rows).to.have.length(3);
    assertRowContents(rows.nodes[0], 'Project Name', 'Student Name', 'Type', 'Last Edited');
    assertRowContents(rows.nodes[1], 'Antelope Freeway', 'Alice', 'App Lab', 'December 31, 2016');
    assertRowContents(rows.nodes[2], 'Another App', 'Alice', 'App Lab', 'October 29, 2016');
  });

  it('shows all students projects if the current students projects all disappear', () => {
    const select = root.find('select');
    select.simulate('change', {target: {value: 'Charlie'}});
    expect(select.nodes[0].value).to.equal('Charlie');

    let rows = root.find('tr');
    expect(rows).to.have.length(2);
    assertRowContents(rows.nodes[0], 'Project Name', 'Student Name', 'Type', 'Last Edited');
    assertRowContents(rows.nodes[1], 'Cats and Kittens', 'Charlie', 'Web Lab', 'November 30, 2016');

    // Remove Charlie's project from the list
    const newProjectsData = Array.from(STUB_PROJECTS_DATA);
    const charlieProjectIndex = newProjectsData.findIndex(project => (
      project.studentName === 'Charlie'
    ));
    newProjectsData.splice(charlieProjectIndex, 1);
    root.setProps({projectsData: newProjectsData});

    // We should now see all students projects, except Charlie's
    rows = root.find('tr');
    expect(select.nodes[0].value).to.equal('_all_students');
    expect(rows).to.have.length(4);
    assertRowContents(rows.nodes[0], 'Project Name', 'Student Name', 'Type', 'Last Edited');
    assertRowContents(rows.nodes[1], 'Batyote', 'Bob', 'Game Lab', 'January 1, 2017');
    assertRowContents(rows.nodes[2], 'Antelope Freeway', 'Alice', 'App Lab', 'December 31, 2016');
    assertRowContents(rows.nodes[3], 'Another App', 'Alice', 'App Lab', 'October 29, 2016');

    // Charlie should no longer appear in the dropdown
    const options = root.find('option');
    expect(options).to.have.length(3);
    expect(options.nodes[0].innerText).to.equal('All');
    expect(options.nodes[1].innerText).to.equal('Alice');
    expect(options.nodes[2].innerText).to.equal('Bob');
  });

  describe('getStudentNames', () => {
    it('shows students in alphabetical order and without duplicates', () => {
      expect(SectionProjectsList.getStudentNames(STUB_PROJECTS_DATA)).to.deep.equal(
        ['Alice', 'Bob', 'Charlie']);
    });
  });
});
