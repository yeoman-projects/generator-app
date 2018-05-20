"use strict";
import * as Generator from "yeoman-generator";
import * as mkdirp from "mkdirp";
const chalk = require("chalk");
const yosay = require("yosay");
const path = require("path");
const GitUrlParse = require("git-url-parse");
const gitconfig = require("gitconfiglocal");
const { version } = require("../../package.json");

module.exports = class extends Generator {
  props: {
    git: string;
    projectName: string;
    api: boolean;
    boilerplate: boolean;
    dockerRepository: string;
  } = {
    git: "",
    projectName: "",
    api: false,
    boilerplate: true,
    dockerRepository: ""
  };
  // yeoman-generator tsd lost this method
  async: () => () => void;
  constructor(args, options) {
    super(args, options);
    this.option("boilerplate", {
      type: Boolean,
      hide: true,
      default: true
    });
  }
  initializing() {
    if (this.fs.exists(this.destinationPath("package.json"))) {
      // 已有项目升级
      this.props.api = this.config.get("api");
      this.props.boilerplate = false;
    } else {
      // 创建新项目
    }

    if (this.fs.exists(this.destinationPath(".git/config"))) {
      const done = this.async();
      gitconfig("./", (err, config) => {
        if (config && config.remote && config.remote.origin) {
          this.props.git = config.remote.origin.url;
        }
        this.props.boilerplate = false;
        done();
      });
    }
  }
  prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Welcome to the bedazzling ${chalk.green(
          "generator-insight"
        )} generator! 
        ${chalk.gray("v" + version)}`
      )
    );
    this.fs.readJSON(this.destinationPath());

    const prompts: Generator.Questions = [
      {
        type: "input",
        name: "git",
        message: "项目仓库地址",
        default: this.props.git
      }
    ];
    if (!this.props.api) {
      prompts.push({
        type: "confirm",
        name: "api",
        message: "是否使用 Golang 做 API 接口？",
        default: false
      });
    }
    prompts.push({
      type: "input",
      name: "dockerRepository",
      message: "该项目的 docker repository 完整地址",
      default: ""
    });

    return this.prompt(prompts).then(props => {
      const git: string = props.git;
      const gitParsed = GitUrlParse(git);
      const api: boolean = props.api;
      const projectName = gitParsed.name;
      this.props.git = git;
      this.props.api = this.props.api || api;
      this.props.projectName = projectName;
      this.props.dockerRepository = props.dockerRepository;
    });
  }

  default() {
    if (
      this.props.boilerplate &&
      path.basename(this.destinationPath()) !== this.props.projectName
    ) {
      this.log(
        `Your generator must be inside a folder named ${
          this.props.projectName
        }\nI'll automatically create this folder.`
      );
      mkdirp.sync(this.props.projectName);
      this.destinationRoot(this.destinationPath(this.props.projectName));
    }
    // after destination root, set config
    this.config.set("version", version);
    this.config.set("dockerRepository", this.props.dockerRepository);
    this.config.set("api", this.props.api);
    this.config.save();

    this.composeWith(require.resolve("../boilerplate"), {
      ...this.options,
      ...this.props
    });
    this.composeWith(require.resolve("../tests"), {
      ...this.options,
      ...this.props
    });
    if (this.props.api) {
      this.composeWith(require.resolve("../api"), {
        ...this.options,
        ...this.props
      });
    }
  }

  install() {
    this.installDependencies({
      npm: false,
      bower: false,
      yarn: true
    });
  }
  end() {
    this.log("Thanks.");
  }
};
