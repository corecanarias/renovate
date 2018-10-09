/**
 * Functions adapted from https://github.com/patrikerdes/gradle-use-latest-versions-plugin
 * TODO: ensure we have added correct wording to satisfy that repository's Apache license
 */

function moduleVersionStringFormatMatch(dependency) {
  return new RegExp(
    '(["\']' + dependency.group + ':' + dependency.name + ':)[^$].*?(["\'])'
  );
}

function moduleVersionMapFormatMatch(dependency) {
  return new RegExp(
    '(group[ \\t]*:[ \\t]*["\']' + dependency.group + '["\'][ \\t]*,[ \\t]*name[ \\t]*:[ \\t]*["\']' + dependency.name + '["\'][ \\t]*,[ \\t]*version[ \\t]*:[ \\t]*["\']).*?(["\'])'
  );
}

function updateGradleVersion(buildGradleContent, dependency, newVersion) {
  if (dependency) {
    const moduleVersionMatch = moduleVersionStringFormatMatch(dependency);
    if (buildGradleContent.match(moduleVersionMatch)) {
      return buildGradleContent.replace(
        moduleVersionMatch,
        `$1${newVersion}$2`
      );
    }

    const mapVersionMatch = moduleVersionMapFormatMatch(dependency);
    if (buildGradleContent.match(mapVersionMatch)) {
      return buildGradleContent.replace(mapVersionMatch, `$1${newVersion}$2`);
    }
  }

  return buildGradleContent;
}

module.exports = {
  updateGradleVersion,
};
