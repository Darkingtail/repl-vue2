/**
 * Component Library Configuration
 * Prompt + Few-shot examples for AI code generation
 */

export interface ComponentLibrary {
  name: string
  prompt: string
}

export const COMPONENT_LIBRARIES: Record<string, ComponentLibrary> = {
  none: {
    name: '原生 HTML',
    prompt: ''
  },

  'element-ui': {
    name: 'Element UI',
    prompt: `
## 组件库要求
优先使用 Element UI 组件库，只有没有合适组件时才用原生 HTML。
确保在 Vue 组件的 script 中不需要额外 import，假设 Element UI 已全局注册。

## 组件映射规则
- 按钮 → el-button (type: primary/success/warning/danger/info, size: medium/small/mini)
- 输入框 → el-input (可带 prefix-icon/suffix-icon, clearable)
- 文本域 → el-input type="textarea"
- 数字输入 → el-input-number
- 表格 → el-table + el-table-column
- 表单 → el-form + el-form-item (带 label, prop)
- 卡片 → el-card (可带 header slot)
- 弹窗 → el-dialog (v-model 控制显示)
- 下拉选择 → el-select + el-option
- 单选 → el-radio / el-radio-group
- 多选 → el-checkbox / el-checkbox-group
- 开关 → el-switch
- 日期选择 → el-date-picker
- 时间选择 → el-time-picker
- 标签页 → el-tabs + el-tab-pane
- 面包屑 → el-breadcrumb + el-breadcrumb-item
- 分页 → el-pagination
- 标签 → el-tag
- 头像 → el-avatar
- 进度条 → el-progress
- 加载 → v-loading 指令
- 消息提示 → this.$message / this.$notify
- 确认框 → this.$confirm

## 代码示例

【设计稿】蓝色圆角按钮，文字"提交"
【代码】
<el-button type="primary">提交</el-button>

【设计稿】带搜索图标的输入框，可清空
【代码】
<el-input v-model="keyword" placeholder="请输入搜索内容" prefix-icon="el-icon-search" clearable />

【设计稿】三列数据表格：姓名、年龄、操作（编辑、删除按钮）
【代码】
<el-table :data="tableData" stripe>
  <el-table-column prop="name" label="姓名" />
  <el-table-column prop="age" label="年龄" width="80" />
  <el-table-column label="操作" width="150">
    <template slot-scope="scope">
      <el-button size="mini" @click="handleEdit(scope.row)">编辑</el-button>
      <el-button size="mini" type="danger" @click="handleDelete(scope.row)">删除</el-button>
    </template>
  </el-table-column>
</el-table>

【设计稿】登录表单：用户名输入框、密码输入框、记住我复选框、登录按钮
【代码】
<el-form :model="form" :rules="rules" ref="loginForm" label-width="80px">
  <el-form-item label="用户名" prop="username">
    <el-input v-model="form.username" prefix-icon="el-icon-user" />
  </el-form-item>
  <el-form-item label="密码" prop="password">
    <el-input v-model="form.password" type="password" prefix-icon="el-icon-lock" show-password />
  </el-form-item>
  <el-form-item>
    <el-checkbox v-model="form.remember">记住我</el-checkbox>
  </el-form-item>
  <el-form-item>
    <el-button type="primary" @click="handleLogin" :loading="loading">登录</el-button>
  </el-form-item>
</el-form>

【设计稿】卡片列表，每个卡片有标题、描述、标签
【代码】
<el-row :gutter="20">
  <el-col :span="8" v-for="item in list" :key="item.id">
    <el-card shadow="hover">
      <div slot="header">{{ item.title }}</div>
      <p>{{ item.description }}</p>
      <el-tag v-for="tag in item.tags" :key="tag" size="small" style="margin-right: 5px">{{ tag }}</el-tag>
    </el-card>
  </el-col>
</el-row>

【设计稿】带分页的数据展示
【代码】
<el-pagination
  @current-change="handlePageChange"
  :current-page="currentPage"
  :page-size="pageSize"
  :total="total"
  layout="total, prev, pager, next, jumper"
/>
`
  }
}

/**
 * Get component library prompt by key
 */
export function getLibraryPrompt(key: string, customPrompt?: string): string {
  if (key === 'custom' && customPrompt) {
    return customPrompt
  }
  return COMPONENT_LIBRARIES[key]?.prompt || ''
}

/**
 * Get all available library options (for API response)
 */
export function getLibraryOptions(): Array<{ key: string; name: string }> {
  const options = Object.entries(COMPONENT_LIBRARIES).map(([key, lib]) => ({
    key,
    name: lib.name
  }))
  options.push({ key: 'custom', name: '自定义' })
  return options
}
