/**
 * 主工作台共享类型。
 * 用于约束 App 外壳、侧栏导航等基础组件之间传递的数据结构。
 */

/** 主工作台左侧导航项。 */
export interface WorkbenchNavigationItem {
  label: string;
  key: string;
}
