# CLA 签名存储分支

**这不是代码分支，请勿合并到 `master`，也不要向它提 PR。**

用途：存放 ChillPass 贡献者许可协议（CLA）的签署记录。

- 签名文件：`signatures/version1/cla.json`
- 由 `.github/workflows/cla.yml` 中的 CLA Assistant 自动写入
- 每有一位贡献者签署 `CLA.md`，这里就会新增一条记录并产生一次提交

本分支是一条**独立的孤儿历史**（无父提交），与 `master` 不共享任何提交，
因此 GitHub 页面上的 "ahead / behind master" 提示对它没有意义，可以忽略。

> 贡献者请看 `master` 分支的 `CONTRIBUTING.md`。
