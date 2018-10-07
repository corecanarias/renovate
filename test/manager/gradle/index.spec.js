jest.mock('fs');
jest.mock('child_process');

const fsMocked = require('fs');
const fs = require('fs-extra');
const childProcessMocked = require('child_process');

const manager = require('../../../lib/manager/gradle/index');

const config = {
  localDir: 'localDir',
  gradle: {
    timeout: 20,
  },
};

// prettier-ignore
const depedenciesFromBuildGradleExample1 = {
  deps: [{
      currentValue: '0.1',
      depName: 'com.fkorotkov:gradle-libraries-plugin',
    }, {
      currentValue: '0.2.3',
      depName: 'gradle.plugin.se.patrikerdes:gradle-use-latest-versions-plugin',
    }, {
      currentValue: '1.3',
      depName: 'org.hamcrest:hamcrest-core',
    }, {
      currentValue: '3.1',
      depName: 'cglib:cglib-nodep',
    }, {
      currentValue: '6.0.9.RELEASE',
      depName: 'org.grails:gorm-hibernate5-spring-boot',
    }, {
      currentValue: '5.1.41',
      depName: 'mysql:mysql-connector-java',
    }, {
      currentValue: '1.5.2.RELEASE',
      depName: 'org.springframework.boot:spring-boot-starter-test',
  }],
};

const updatesDependenciesReport = fs.readFileSync(
  'test/_fixtures/gradle/updatesReport.json',
  'utf8'
);

describe('manager/gradle', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    fsMocked.readFileSync = jest.fn(() => updatesDependenciesReport);
    childProcessMocked.execSync = jest.fn(() =>
      Buffer.from('gradle output', 'utf8')
    );
  });

  describe('extractDependencies', () => {
    it('should return gradle dependencies', () => {
      const dependencies = manager.extractDependencies(
        'content',
        'filename',
        config
      );

      expect(dependencies).toEqual(depedenciesFromBuildGradleExample1);
    });

    it('should return null if there is no dependencies', () => {
      fsMocked.readFileSync = jest.fn(() =>
        fs.readFileSync('test/_fixtures/gradle/updatesReportEmpty.json', 'utf8')
      );
      const dependencies = manager.extractDependencies(
        'content',
        'filename',
        config
      );

      expect(dependencies).toEqual(null);
    });

    it('should return null if gradle execution fails', () => {
      childProcessMocked.execSync = jest.fn(() => {
        throw new Error();
      });
      const dependencies = manager.extractDependencies(
        'content',
        'filename',
        config
      );

      expect(dependencies).toEqual(null);
    });

    it('should execute gradle with the proper parameters', () => {
      manager.extractDependencies('content', 'filename', config);

      expect(childProcessMocked.execSync.mock.calls[0][0]).toBe(
        'gradle --init-script init.gradle dependencyUpdates -Drevision=release'
      );
      expect(childProcessMocked.execSync.mock.calls[0][1]).toMatchObject({
        cwd: 'localDir',
        timeout: 20000,
      });
    });

    it('should write the gradle config file in the tmp dir', () => {
      manager.extractDependencies('content', 'filename', config);

      expect(fsMocked.writeFileSync.mock.calls[0][0]).toBe('localDir/filename');
      expect(fsMocked.writeFileSync.mock.calls[0][1]).toBe('content');
    });

    it('should configure the useLatestVersion plugin', () => {
      manager.extractDependencies('content', 'filename', config);

      expect(fsMocked.writeFileSync.mock.calls[1][0]).toBe(
        'localDir/init.gradle'
      );
    });
  });

  describe('getPackageUpdates', () => {
    it('should return outdated dependencies', () => {
      // prettier-ignore
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

    it('should read the right updates report', () => {
      manager.getPackageUpdates(config);

      expect(fsMocked.readFileSync.mock.calls.length).toBe(1);
      expect(fsMocked.readFileSync.mock.calls[0][0]).toBe(
        'localDir/build/dependencyUpdates/report.json'
      );
    });
  });

  describe('updateDependency', () => {
    it('should update an existing dependency', () => {
      const buildGradleContent = fs.readFileSync(
        'test/_fixtures/gradle/build.gradle.example1',
        'utf8'
      );
      // prettier-ignore
      const upgrade = {
        depGroup: 'cglib', name: 'cglib-nodep', version: '3.1',
        available: { release: '3.2.8', milestone: null, integration: null },
      };
      const buildGradleContentUpdated = manager.updateDependency(
        buildGradleContent,
        upgrade
      );

      expect(buildGradleContent).not.toMatch('cglib:cglib-nodep:3.2.8');

      expect(buildGradleContentUpdated).toMatch('cglib:cglib-nodep:3.2.8');
      expect(buildGradleContentUpdated).not.toMatch('cglib:cglib-nodep:3.1');
    });
  });
});
