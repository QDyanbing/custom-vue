# apiLifecycle.ts 说明

## 概述

`apiLifecycle.ts` 提供组件生命周期的注册与触发：用户通过 `onBeforeMount`、`onMounted`、`onBeforeUpdate`、`onUpdated`、`onBeforeUnmount`、`onUnmounted` 注册钩子，渲染器在挂载、更新、卸载的对应时机调用 `triggerHook` 执行这些钩子。

## 目录

- [LifecycleHooks 枚举](#lifecyclehooks-枚举)
- [createHook 与 injectHook](#createhook-与-injecthook)
- [对外 API（onXxx）](#对外-apionxxx)
- [triggerHook](#triggerhook)
- [与 component / renderer 的关系](#与-component--renderer-的关系)

## LifecycleHooks 枚举

用短字符串标识六种生命周期类型，挂到组件实例上作为属性名使用：

| 枚举值 | 含义 |
|--------|------|
| `BEFORE_MOUNT` ('bm') | 挂载前 |
| `MOUNTED` ('m') | 挂载后 |
| `BEFORE_UPDATE` ('bu') | 更新前 |
| `UPDATED` ('u') | 更新后 |
| `BEFORE_UNMOUNT` ('bum') | 卸载前 |
| `UNMOUNTED` ('um') | 卸载后 |

## createHook 与 injectHook

- **createHook(type)**：根据 `type` 返回一个“注册函数”。用户调用 `onMounted(fn)` 时，相当于调用该注册函数，默认把 `fn` 注入到 `getCurrentInstance()` 返回的当前实例上。
- **injectHook(target, hook, type)**：把 `hook` 挂到 `target[type]` 数组中。执行前会用 `setCurrentInstance(target)` 设置当前实例，执行完后 `unsetCurrentInstance()`，这样在钩子函数里调用 `getCurrentInstance()` 能拿到正确实例。

每个钩子都会被包装成“先 setCurrentInstance 再执行 hook 再 unsetCurrentInstance”的形式再 push 到实例上，保证异步或嵌套场景下 currentInstance 正确。

## 对外 API（onXxx）

- `onBeforeMount(hook?, target?)`
- `onMounted(hook?, target?)`
- `onBeforeUpdate(hook?, target?)`
- `onUpdated(hook?, target?)`
- `onBeforeUnmount(hook?, target?)`
- `onUnmounted(hook?, target?)`

`target` 默认为 `getCurrentInstance()`，一般在 `setup` 中调用时不传，钩子会挂到当前组件实例上。

## triggerHook

供渲染器调用，在对应时机触发实例上已注册的钩子：

- **挂载**：`setupRenderEffect` 内，首渲时在 patch 子树前触发 `BEFORE_MOUNT`，patch 后触发 `MOUNTED`。
- **更新**：再次执行 componentUpdateFn 时，在 patch 子树前触发 `BEFORE_UPDATE`，patch 后触发 `UPDATED`。
- **卸载**：`unmountComponent` 内，在 `unmount(instance.subTree)` 前触发 `BEFORE_UNMOUNT`，之后触发 `UNMOUNTED`。

`triggerHook(instance, type)` 会顺序执行 `instance[type]` 数组中的每个函数。

## 与 component / renderer 的关系

- **component.ts**：提供 `getCurrentInstance`、`setCurrentInstance`、`unsetCurrentInstance`，供 injectHook 在执行钩子前后设置/清除当前实例。
- **renderer.ts**：在 `setupRenderEffect` 的 componentUpdateFn 中，在挂载/更新分支的合适位置调用 `triggerHook(instance, LifecycleHooks.xxx)`；在 `unmountComponent` 中调用 `triggerHook` 触发卸载前后钩子。
