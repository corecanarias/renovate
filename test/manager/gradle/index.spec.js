jest.mock('fs-extra');
jest.mock('child-process-promise');

const fs = require('fs-extra');
const fsReal = require('fs');
const { exec } = require('child-process-promise');

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

const updatesDependenciesReport = fsReal.readFileSync(
  'test/_fixtures/gradle/updatesReport.json',
  'utf8'
);

describe('manager/gradle', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    fs.readFile.mockReturnValue(updatesDependenciesReport);
    exec.mockReturnValue({ stdout: 'gradle output', stderr: '' });
  });

  describe('extractDependencies', () => {
    it('should return gradle dependencies', async () => {
      const dependencies = await manager.extractDependencies(
        'content',
        'filename',
        config
      );

      expect(dependencies).toEqual(depedenciesFromBuildGradleExample1);
    });

    it('should return null if there is no dependencies', async () => {
      fs.readFile.mockReturnValue(
        fsReal.readFileSync(
          'test/_fixtures/gradle/updatesReportEmpty.json',
          'utf8'
        )
      );
      const dependencies = await manager.extractDependencies(
        'content',
        'filename',
        config
      );

      expect(dependencies).toEqual(null);
    });

    it('should return null if gradle execution fails', async () => {
      exec.mockImplementation(() => {
        throw new Error();
      });
      const dependencies = await manager.extractDependencies(
        'content',
        'filename',
        config
      );

      expect(dependencies).toEqual(null);
    });

    it('should execute gradle with the proper parameters', async () => {
      await manager.extractDependencies('content', 'filename', config);

      expect(exec.mock.calls[0][0]).toBe(
        'gradle --init-script init.gradle dependencyUpdates -Drevision=release'
      );
      expect(exec.mock.calls[0][1]).toMatchSnapshot();
    });

    it('should write the gradle config file in the tmp dir', async () => {
      await manager.extractDependencies('content', 'filename', config);

      expect(fs.writeFile.mock.calls[0][0]).toBe('localDir/filename');
      expect(fs.writeFile.mock.calls[0][1]).toBe('content');
    });

    it('should configure the useLatestVersion plugin', async () => {
      await manager.extractDependencies('content', 'filename', config);

      expect(fs.writeFile.mock.calls[1][0]).toBe('localDir/init.gradle');
    });
  });

  describe('getPackageUpdates', () => {
    it('should return outdated dependencies', async () => {
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

      const outdatedDependencies = await manager.getPackageUpdates(config);

      expect(outdatedDependencies).toMatchObject(expectedOutdatedDependencies);
    });

    it('should read the right updates report', async () => {
      await manager.getPackageUpdates(config);

      expect(fs.readFile.mock.calls.length).toBe(1);
      expect(fs.readFile.mock.calls[0][0]).toBe(
        'localDir/build/dependencyUpdates/report.json'
      );
    });
  });

  describe('updateDependency', () => {
    it('should update an existing dependency', () => {
      const buildGradleContent = fsReal.readFileSync(
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
