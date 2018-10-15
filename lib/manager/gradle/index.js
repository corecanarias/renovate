const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const gradle = require('./build-gradle');

const GRADLE_DEPENDENCY_REPORT_COMMAND =
  'gradle --init-script init.gradle dependencyUpdates -Drevision=release';
const GRADLE_DEPENDENCY_REPORT_FILENAME = 'build/dependencyUpdates/report.json';

function extractDependencies(content, fileName, config) {
  logger.debug('gradle.extractDependencies()');
  const gradleFile = path.join(config.localDir, fileName);

  fs.writeFileSync(gradleFile, content);
  configureUseLatestVersionPlugin(config.localDir);
  const gradleSuccess = executeGradle(config);

  if (gradleSuccess) {
    const deps = extractDependenciesFromUpdatesReport(config.localDir);
    if (deps.length === 0) {
      return null;
    }
    return { deps };
  } else {
    return null;
  }
}

function getPackageUpdates(config) {
  logger.debug('gradle.getPackageUpdates()');

  const contents = fs
    .readFileSync(path.join(config.localDir, GRADLE_DEPENDENCY_REPORT_FILENAME))
    .toString();
  const dependencies = JSON.parse(contents);

  return dependencies.outdated.dependencies.map(dep => {
    const update = { ...dep };
    update.depGroup = dep.group;
    update.depName = `${dep.group}:${dep.name}`;
    update.newValue = dep.available.release;
    return update;
  });
}

function updateDependency(fileContent, upgrade) {
  // prettier-ignore
  logger.debug(`gradle.updateDependency(): depName:${upgrade.depName}, version:${upgrade.version} ==> ${upgrade.newValue}`);

  const newFileContent = gradle.updateGradleVersion(
    fileContent,
    buildGradleDependency(upgrade),
    upgrade.available.release
  );
  return newFileContent;
}

function configureUseLatestVersionPlugin(localDir) {
  const content = `
gradle.projectsLoaded {
    rootProject.allprojects {
        buildscript {
            repositories {
                maven {
                 url "https://plugins.gradle.org/m2/"
                }
            }
           dependencies {
            classpath "gradle.plugin.se.patrikerdes:gradle-use-latest-versions-plugin:0.2.3"
            classpath 'com.github.ben-manes:gradle-versions-plugin:0.17.0'
          }
        }
        afterEvaluate { project ->
          project.apply plugin: 'com.github.ben-manes.versions'
          project.apply plugin: 'se.patrikerdes.use-latest-versions'
        }
    }
}  
  `;
  const gradleInitFile = path.join(localDir, 'init.gradle');
  fs.writeFileSync(gradleInitFile, content);
}

function buildGradleDependency(config) {
  return { group: config.depGroup, name: config.name, version: config.version };
}

function extractDependenciesFromUpdatesReport(localDir) {
  const contents = fs
    .readFileSync(path.join(localDir, GRADLE_DEPENDENCY_REPORT_FILENAME))
    .toString();
  const dependencies = JSON.parse(contents);
  const combinedGradleDeps = dependencies.current.dependencies.concat(
    dependencies.exceeded.dependencies,
    dependencies.outdated.dependencies,
    dependencies.unresolved.dependencies
  );
  return combinedGradleDeps.map(dependency => {
    return {
      depName: `${dependency.group}:${dependency.name}`,
      currentValue: dependency.version,
    };
  });
}

function executeGradle(config) {
  gradleTimeout =
    config.gradle && config.gradle.timeout
      ? config.gradle.timeout * 1000
      : undefined;
  let gradleOutput;
  try {
    gradleOutput = childProcess.execSync(GRADLE_DEPENDENCY_REPORT_COMMAND, {
      stdio: 'pipe',
      timeout: gradleTimeout,
      cwd: config.localDir,
    });
  } catch (e) {
    logger.error(
      `Gradle command ${GRADLE_DEPENDENCY_REPORT_COMMAND} failed. Exit code: ${
        e.status
      }`
    );
    if (e.output) {
      logger.error(e.output.toString());
    }
    return false;
  }
  logger.info(gradleOutput.toString());
  return true;
}

module.exports = {
  extractDependencies,
  getPackageUpdates,
  updateDependency,
  language: 'java',
};
