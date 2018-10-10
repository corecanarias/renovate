const manager = require('../../../lib/manager/gradle/index');

jest.mock('fs');
jest.mock('child_process');

const fsMocked = require('fs');
const fs = require('fs-extra');
const child_processMocked = require('child_process');

const config = {
  localDir: "localDir"
};

const updatesDependenciesReport = fs.readFileSync('test/_fixtures/gradle/updatesReport.json', 'utf8');

describe("manager/gradle", () => {

  beforeEach(() => {
    jest.resetAllMocks();
    fsMocked.readFileSync = jest.fn(() => updatesDependenciesReport);
  });

  describe("extractDependencies", () => {
    it('should return gradle dependencies', function () {
      const dependencies = manager.extractDependencies("content", "filename", config);

      expect(dependencies).toEqual({"deps": [{"name": "dummy"}]})
    });

    it('should execute gradle with the proper parameters', function () {
      manager.extractDependencies("content", "filename", config);

      expect(child_processMocked.execSync.mock.calls.length).toBe(1);
      expect(child_processMocked.execSync.mock.calls[0][0]).toBe("gradle dependencyUpdates -Drevision=release");
      expect(child_processMocked.execSync.mock.calls[0][1]).toMatchObject({cwd: "localDir"});
    });
  });

  describe("getPackageUpdates", () => {

    it('should return outdated dependencies', function () {
      const expectedOutdatedDependencies = [{
          depGroup: "cglib", name: "cglib-nodep", version: "3.1",
          available: {release: "3.2.8", milestone: null, integration: null},
        }, {
          depGroup: "org.grails", name: "gorm-hibernate5-spring-boot", version: "6.0.9.RELEASE",
          available: {release: "6.1.10.RELEASE", milestone: null, integration: null}
        }, {
          depGroup: "mysql", name: "mysql-connector-java", version: "5.1.41",
          available: {release: "8.0.12", milestone: null, integration: null}
        }, {
          depGroup: "org.springframework.boot", name: "spring-boot-starter-test", version: "1.5.2.RELEASE",
          available: {release: "2.0.5.RELEASE", milestone: null, integration: null}
      }];

      const outdatedDependencies = manager.getPackageUpdates(config);

      expect(outdatedDependencies).toMatchObject(expectedOutdatedDependencies);
    });

    it('should read the right updates report', function () {
      manager.getPackageUpdates(config);

      expect(fsMocked.readFileSync.mock.calls.length).toBe(1);
      expect(fsMocked.readFileSync.mock.calls[0][0]).toBe("localDir/build/dependencyUpdates/report.json");
    });
  });

  describe("updateDependency", () => {

    it('should update an existing dependency', function () {
      const buildGradleContent = fs.readFileSync('test/_fixtures/gradle/build.gradle.example1', 'utf8');
      const upgrade = {
        depGroup: "cglib", name: "cglib-nodep", version: "3.1",
        available: {release: "3.2.8", milestone: null, integration: null},
      };
      const buildGradleContentUpdated = manager.updateDependency(buildGradleContent, upgrade);

      expect(buildGradleContent).not.toMatch("cglib:cglib-nodep:3.2.8");

      expect(buildGradleContentUpdated).toMatch("cglib:cglib-nodep:3.2.8");
      expect(buildGradleContentUpdated).not.toMatch("cglib:cglib-nodep:3.1");
    });
  });
});
