# 说明
此文件不作为开发指导，只是作为开发人员的参考。
此处是记录git分支的索引，用来说明每个分支的作用。
master主分支，所有修改后的代码都需要合并到此分支，是最新的代码。
jycs-v1.0 版本分支，用来存储v1.0版本的代码。
repair_v1.0 分支，用来存储jycs-v1.0版本产生的bug的修复代码，验证无误后合入jycs-v1.0分支。
speed_v1.0 分支，用来存储jycs-v1.0版本的性能优化代码，验证无误后合入master分支，由master分支创建2.0的版本。
cloud_base 分支， 是用来后端服务，数据传输给后端到服务器保存。
jycs-v2.0 版本分支，用来存储v2.0版本的代码。

# 操作
git branch 查看当前分支
git branch branchName 创建分支
git checkout branchName 切换到指定分支
git merge branchName 合并指定分支到当前分支
git branch -d branchName 删除指定分支