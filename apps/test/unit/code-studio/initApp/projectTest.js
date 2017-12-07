import {expect} from '../../../util/configuredChai';
import sinon from 'sinon';
import {replaceOnWindow, restoreOnWindow} from '../../../util/testUtils';
import * as utils from '@cdo/apps/utils';
import project from '@cdo/apps/code-studio/initApp/project';
import {files as filesApi} from '@cdo/apps/clientApi';
import header from '@cdo/apps/code-studio/header';

describe('project.js', () => {

  describe('project.getProjectUrl', function () {

    let stubUrl;
    let url;

    beforeEach(function () {
      stubUrl = sinon.stub(project, 'getUrl').callsFake(() => url);
    });

    afterEach(function () {
      stubUrl.restore();
    });

    it('typical url', function () {
      url = 'http://url';
      expect(project.getProjectUrl('/view')).to.equal('http://url/view');
    });

    it('with ending slashes', function () {
      url = 'http://url//';
      expect(project.getProjectUrl('/view')).to.equal('http://url/view');
    });

    it('with query string', function () {
      url = 'http://url?query';
      expect(project.getProjectUrl('/view')).to.equal('http://url/view?query');
    });

    it('with hash', function () {
      url = 'http://url#hash';
      expect(project.getProjectUrl('/view')).to.equal('http://url/view');
    });

    it('with ending slashes, query, and hash', function () {
      url = 'http://url/?query#hash';
      expect(project.getProjectUrl('/view')).to.equal('http://url/view?query');
    });
  });

  describe('project.getShareUrl', () => {
    let fakeLocation;
    const fakeProjectId = 'fake-project-id';

    beforeEach(() => {
      sinon.stub(project, 'getLocation').callsFake(() => fakeLocation);
      sinon.stub(project, 'getCurrentId').returns(fakeProjectId);
    });

    afterEach(() => {
      project.getCurrentId.restore();
      project.getLocation.restore();
    });

    function setFakeLocation(url) {
      fakeLocation = document.createElement('a');
      fakeLocation.href = url;
    }

    describe('App Lab', () => {
      beforeEach(() => sinon.stub(project, 'getStandaloneApp').returns('applab'));
      afterEach(() => project.getStandaloneApp.restore());

      it('studio.code.org', () => {
        setFakeLocation(`https://studio.code.org/projects/applab/${fakeProjectId}/edit`);
        expect(project.getShareUrl()).to.equal(`https://studio.code.org/projects/applab/${fakeProjectId}`);
      });

      it('test-studio.code.org', () => {
        setFakeLocation(`https://test-studio.code.org/projects/applab/${fakeProjectId}/edit`);
        expect(project.getShareUrl()).to.equal(`https://test-studio.code.org/projects/applab/${fakeProjectId}`);
      });
      it('staging-studio.code.org', () => {
        setFakeLocation(`https://staging-studio.code.org/projects/applab/${fakeProjectId}/edit`);
        expect(project.getShareUrl()).to.equal(`https://staging-studio.code.org/projects/applab/${fakeProjectId}`);
      });

      it('localhost-studio.code.org:3000', () => {
        setFakeLocation(`http://localhost-studio.code.org:3000/projects/applab/${fakeProjectId}/edit`);
        expect(project.getShareUrl()).to.equal(`http://localhost-studio.code.org:3000/projects/applab/${fakeProjectId}`);
      });
    });

    describe('Web Lab', () => {
      beforeEach(() => sinon.stub(project, 'getStandaloneApp').returns('weblab'));
      afterEach(() => project.getStandaloneApp.restore());

      it('code.org => codeprojects.org', () => {
        setFakeLocation('https://code.org/');
        expect(project.getShareUrl()).to.equal(`https://codeprojects.org/${fakeProjectId}`);
      });

      it('studio.code.org => codeprojects.org', () => {
        setFakeLocation('https://studio.code.org/');
        expect(project.getShareUrl()).to.equal(`https://codeprojects.org/${fakeProjectId}`);
      });

      it('test.code.org => test.codeprojects.org', () => {
        setFakeLocation('https://test.code.org/');
        expect(project.getShareUrl()).to.equal(`https://test.codeprojects.org/${fakeProjectId}`);
      });

      it('test-studio.code.org => test.codeprojects.org', () => {
        setFakeLocation('https://test-studio.code.org/');
        expect(project.getShareUrl()).to.equal(`https://test.codeprojects.org/${fakeProjectId}`);
        setFakeLocation('https://test.studio.code.org/');
        expect(project.getShareUrl()).to.equal(`https://test.codeprojects.org/${fakeProjectId}`);
      });

      it('staging.code.org => staging.codeprojects.org', () => {
        setFakeLocation('https://staging.code.org/');
        expect(project.getShareUrl()).to.equal(`https://staging.codeprojects.org/${fakeProjectId}`);
      });

      it('staging-studio.code.org => staging.codeprojects.org', () => {
        setFakeLocation('https://staging-studio.code.org/');
        expect(project.getShareUrl()).to.equal(`https://staging.codeprojects.org/${fakeProjectId}`);
        setFakeLocation('https://staging.studio.code.org/');
        expect(project.getShareUrl()).to.equal(`https://staging.codeprojects.org/${fakeProjectId}`);
      });

      it('localhost.code.org:3000 => localhost.codeprojects.org:3000', () => {
        setFakeLocation('http://localhost.code.org:3000/');
        expect(project.getShareUrl()).to.equal(`http://localhost.codeprojects.org:3000/${fakeProjectId}`);
      });

      it('localhost-studio.code.org:3000 => localhost.codeprojects.org:3000', () => {
        setFakeLocation('http://localhost-studio.code.org:3000/');
        expect(project.getShareUrl()).to.equal(`http://localhost.codeprojects.org:3000/${fakeProjectId}`);
        setFakeLocation('http://localhost.studio.code.org:3000/');
        expect(project.getShareUrl()).to.equal(`http://localhost.codeprojects.org:3000/${fakeProjectId}`);
      });
    });
  });

  describe('toggleMakerEnabled()', () => {
    let sourceHandler;

    beforeEach(() => {
      sourceHandler = createStubSourceHandler();
      replaceOnWindow('appOptions', {
        level: {
          isProjectLevel: true,
        },
      });
      sinon.stub(utils, 'reload');
      sinon.stub(project, 'saveSourceAndHtml_').callsFake((source, callback) => {
        callback();
      });
    });

    afterEach(() => {
      project.saveSourceAndHtml_.restore();
      utils.reload.restore();
      restoreOnWindow('appOptions');
    });

    it('performs a save with maker enabled if it was disabled', () => {
      sourceHandler.getMakerAPIsEnabled.returns(false);
      project.init(sourceHandler);
      return project.toggleMakerEnabled().then(() => {
        expect(project.saveSourceAndHtml_).to.have.been.called;
        expect(project.saveSourceAndHtml_.getCall(0).args[0].makerAPIsEnabled).to.be.true;
      });
    });

    it('performs a save with maker disabled if it was enabled', () => {
      sourceHandler.getMakerAPIsEnabled.returns(true);
      project.init(sourceHandler);
      return project.toggleMakerEnabled().then(() => {
        expect(project.saveSourceAndHtml_).to.have.been.called;
        expect(project.saveSourceAndHtml_.getCall(0).args[0].makerAPIsEnabled).to.be.false;
      });
    });

    it('always results in a page reload', () => {
      project.init(sourceHandler);
      expect(utils.reload).not.to.have.been.called;
      return project.toggleMakerEnabled().then(() => {
        expect(utils.reload).to.have.been.called;
      });
    });
  });
});

describe('project.saveThumbnail', () => {
  const STUB_CHANNEL_ID = 'STUB-CHANNEL-ID';
  const STUB_BLOB = 'stub-binary-data';

  beforeEach(() => {
    sinon.stub(header, 'updateTimestamp');
    sinon.stub(filesApi, 'putFile');

    const projectData = {
      id: STUB_CHANNEL_ID,
      isOwner: true
    };
    project.updateCurrentData_(null, projectData);
  });

  afterEach(() => {
    project.updateCurrentData_(null, undefined);

    filesApi.putFile.restore();
    header.updateTimestamp.restore();
  });

  it('calls filesApi.putFile with correct parameters', () => {
    project.saveThumbnail(STUB_BLOB);

    expect(filesApi.putFile).to.have.been.calledOnce;
    const call = filesApi.putFile.getCall(0);
    expect(call.args[0]).to.equal('.metadata/thumbnail.png');
    expect(call.args[1]).to.equal(STUB_BLOB);
  });

  it('succeeds if filesApi.putFile succeeds', done => {
    filesApi.putFile.callsFake((path, blob, success, error) => success());

    project.saveThumbnail(STUB_BLOB).then(done);
  });

  it('fails if project is not initialized', done => {
    project.__TestInterface.setCurrentData(undefined);

    const promise = project.saveThumbnail(STUB_BLOB);
    promise.catch(e => {
      expect(e).to.contain('Project not initialized');
      expect(filesApi.putFile).not.to.have.been.called;
      done();
    });
  });

  it('fails if project is not owned by the current user', done => {
    project.__TestInterface.setCurrentData({});

    project.saveThumbnail(STUB_BLOB).catch(e => {
      expect(e).to.contain('Project not owned by current user');
      expect(filesApi.putFile).not.to.have.been.called;
      done();
    });
  });

  it('fails if filesApi.putFile fails', done => {
    filesApi.putFile.callsFake((path, blob, success, error) => error('foo'));

    project.saveThumbnail(STUB_BLOB).catch(e => {
      expect(e).to.contain('foo');
      done();
    });
  });
});

function createStubSourceHandler() {
  return {
    setInitialLevelHtml: sinon.stub(),
    getLevelHtml: sinon.stub(),
    setInitialLevelSource: sinon.stub(),
    getLevelSource: sinon.stub().resolves(),
    setInitialAnimationList: sinon.stub(),
    getAnimationList: sinon.stub().callsFake(cb => cb({})),
    setMakerAPIsEnabled: sinon.stub(),
    getMakerAPIsEnabled: sinon.stub(),
  };
}
