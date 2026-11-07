// 课程表。
//
// 只写「标题」，不写 id / 文件名 / 编号 —— 这些由 build() 统一推导，
// 这样增删一课不会让后面几百课的编号全部错位。
//
// 每课的粒度就是「几行代码」：能在一屏里讲完，能在一个 commit 里合入。

export type Status = 'ready' | 'writing' | 'planned';

type LessonSpec = string | [title: string, status: Status];

interface ChapterSpec {
  id: string;
  title: string;
  subtitle: string;
  goal: string;
  viz?: string[];
  lessons: LessonSpec[];
}

export interface Lesson {
  id: string;
  chapter: string;
  chapterTitle: string;
  part: string;
  num: string;
  index: number;
  title: string;
  status: Status;
  file: string;
}

export interface Chapter {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  goal: string;
  part: string;
  viz?: string[];
  status: Status;
  lessons: Lesson[];
}

export interface Part {
  name: string;
  chapters: Chapter[];
  lessons: number;
}

const SPEC: { name: string; note: string; chapters: ChapterSpec[] }[] = [
  {
    name: '第一部 · 地基',
    note: '先把「时间」和「循环」这两件事办对。后面所有东西都长在这上面。',
    chapters: [
      {
        id: 'c01',
        title: '造一台发动机',
        subtitle: '为什么从零写，以及什么才算写完',
        goal: '建立全局地图：引擎由什么组成、这套课最终要交付什么。',
        viz: ['frameLoop'],
        lessons: [
          ['造一台发动机', 'ready'],
          '引擎的最小闭环',
          '三只时钟',
          '死亡螺旋',
          '承认自己会死',
          '一张课程地图',
          '你要交付的东西',
          '怎么用这套课',
        ],
      },
      {
        id: 'c02',
        title: '项目骨架',
        subtitle: '从安装锈语开始，再到工作区与包边界',
        goal: '零基础也能装好工具链、跑通第一个程序，并让代码有地方放且放对地方。',
        lessons: [
          ['安装锈语工具链', 'ready'],
          ['第一个程序', 'ready'],
          '创建工作区',
          '第一个包',
          '什么时候该拆包',
          '依赖方向',
          '特性开关',
          '日志初始化',
          '错误类型',
          '断言与不变量',
          '第一次运行引擎',
        ],
      },
      {
        id: 'c03',
        title: '锈语的形状',
        subtitle: '借用检查如何改写引擎架构',
        goal: '接受 Rust 不会让你写出 Unity 的 GameObject，并理解那些替代设计为什么必然出现。',
        lessons: [
          ['被借用检查改写的那部分架构', 'ready'],
          '一个游戏引擎片段',
          '变换与位置',
          '两个可变引用',
          '所有权不是垃圾回收',
          '父子指针的死结',
          '内部可变性',
          '内部可变性的代价',
          '句柄与内存区',
          '索引取代指针',
          '系统代替方法',
          '借用分裂',
          '架构是语言的函数',
        ],
      },
      {
        id: 'c04',
        title: '时间',
        subtitle: '把不确定的墙钟变成确定的步进',
        goal: '写出一个不漂移、不雪崩、可测试的固定步长时钟。',
        viz: ['clock'],
        lessons: [
          '为什么不能直接用增量时间',
          '时长与瞬间',
          '累加器',
          '固定步长',
          '每帧上限',
          '丢弃策略',
          '插值系数',
          '暂停与倍速',
          '给时钟写单元测试',
        ],
      },
      {
        id: 'c05',
        title: '主循环',
        subtitle: '事件驱动，还是一直自旋',
        goal: '把窗口事件、tick、渲染串成一个不会打瞌睡的循环。',
        lessons: [
          '三种循环模型',
          '窗口库的事件循环',
          '等待回调是什么',
          '轮询模式',
          '请求重绘的含义',
          '一次固定步进的顺序',
          '一次帧的顺序',
          '窗口被遮挡时',
          '掉帧那一刻',
          '循环的验收标准',
        ],
      },
      {
        id: 'c06',
        title: '失败',
        subtitle: '错误、中断与用户的最后一道防线',
        goal: '驱动崩掉、磁盘写满、显存爆掉时，引擎仍然体面。',
        lessons: [
          '错误不是异常',
          '结果的传播',
          '错误库的选择',
          '什么时候该中断',
          '渲染线程死了',
          '致命错误的出口',
          '能恢复的错误',
          '日志里的上下文',
          '把错误说成人话',
        ],
      },
      {
        id: 'c07',
        title: '配置',
        subtitle: '选项、默认值与向后兼容',
        goal: '同一个二进制，在不同机器上的行为可解释、可复现。',
        lessons: [
          '配置从哪来',
          '命令行参数',
          '环境变量',
          '配置文件',
          '默认值',
          '优先级',
          '校验',
          '版本迁移',
          '保存选项',
        ],
      },
      {
        id: 'c08',
        title: '诊断',
        subtitle: '日志、计数与第一现场',
        goal: '出问题时，三十秒内知道发生了什么。',
        lessons: [
          '日志分级',
          '结构化日志',
          '每帧统计',
          '帧时间直方图',
          '命名作用域',
          '断言消息怎么写',
          '崩溃转储',
          '现场快照',
          '诊断的边界',
        ],
      },
      {
        id: 'c09',
        title: '可复现',
        subtitle: '确定性、种子与测试',
        goal: '同样的输入，永远得到同样的输出。',
        lessons: [
          '确定性的价值',
          '固定种子',
          '浮点陷阱',
          '迭代顺序',
          '快照测试',
          '参考图',
          '无头模式',
          '时间加速',
          '在持续集成里跑引擎',
          '可复现清单',
        ],
      },
    ],
  },
  {
    name: '第二部 · 平台',
    note: '窗口、事件、线程。引擎与操作系统的每一处接缝，都要显式处理。',
    chapters: [
      {
        id: 'c10',
        title: '窗口',
        subtitle: '从创建窗口到第一块颜色',
        goal: '开出一个真正的窗口，并且知道它在每种情况下会怎么坏。',
        viz: ['eventFlow'],
        lessons: [
          '平台的形状',
          '创建窗口',
          '标题与图标',
          '逻辑尺寸与物理尺寸',
          '最小尺寸',
          '全屏',
          '无边框',
          '窗口句柄',
          '多窗口',
          '关闭请求',
          '退出顺序',
          '第一块颜色',
        ],
      },
      {
        id: 'c11',
        title: '事件',
        subtitle: '把系统消息翻译成引擎语义',
        goal: '输入不再是一堆 match 分支，而是一层可测试的语义。',
        lessons: [
          '事件的两层',
          '键盘事件',
          '文本输入',
          '鼠标按钮',
          '鼠标移动',
          '滚轮',
          '修饰键',
          '焦点',
          '事件分发',
          '消费与冒泡',
          '事件录制',
        ],
      },
      {
        id: 'c12',
        title: '输入',
        subtitle: '按键、动作与上下文',
        goal: '玩家按下的不是 W，是「前进」。',
        lessons: [
          '原始输入',
          '按键集合',
          '边沿触发',
          '按住与重复',
          '动作映射',
          '上下文栈',
          '输入缓冲',
          '手柄',
          '死区',
          '重绑定',
          '输入回放',
        ],
      },
      {
        id: 'c13',
        title: '显示器',
        subtitle: '像素密度、缩放与多屏',
        goal: '窗口在 4K、5K、投影仪上都不糊、不歪。',
        lessons: [
          '物理像素',
          '缩放因子',
          '逻辑坐标',
          '多显示器',
          '刷新率',
          '色彩空间',
          '高动态初探',
          '缩放变化',
        ],
      },
      {
        id: 'c14',
        title: '生命周期',
        subtitle: '后台、睡眠、设备丢失',
        goal: '引擎在被打断之后还能回来，而不是留下半帧。',
        lessons: [
          '启动顺序',
          '恢复与挂起',
          '后台与前台',
          '睡眠唤醒',
          '设备丢失',
          '优雅退出',
          '强制终止',
          '存档时机',
          '生命周期表',
        ],
      },
      {
        id: 'c15',
        title: '线程',
        subtitle: '主线程、渲染线程与工作池',
        goal: '把重活挪走，同时不引入数据竞争和卡顿。',
        lessons: [
          '主线程的职责',
          '渲染线程',
          '工作线程池',
          '任务与句柄',
          '通道',
          '背压',
          '线程命名',
          '亲和性',
          '关闭握手',
          '线程池验收',
        ],
      },
      {
        id: 'c16',
        title: '文件',
        subtitle: '路径、资源根与原子写',
        goal: '读资源、存进度，且在崩溃时不留半个文件。',
        lessons: [
          '路径不是字符串',
          '资源根',
          '用户目录',
          '只读与可写',
          '原子写',
          '临时文件',
          '权限失败',
          '打包后的路径',
        ],
      },
    ],
  },
  {
    name: '第三部 · 渲染器',
    note: '从一块清屏色，到能跑起来的 3D 场景。每一课只加几行。',
    chapters: [
      {
        id: 'c17',
        title: '图形接口选型',
        subtitle: '两种图形后端怎么选',
        goal: '理解抽象的成本，并做出可撤退的选择。',
        lessons: [
          '你要抽象什么',
          '两种图形后端',
          '后端与适配器',
          '着色语言',
          '抽象泄漏',
          '迁移路径',
          '第一个三角形要多久',
          '选型结论',
        ],
      },
      {
        id: 'c18',
        title: '实例与适配器',
        subtitle: '先问机器会不会',
        goal: '拿到一个能用的 GPU，并且在没有 GPU 时给出人话。',
        lessons: [
          '实例是什么',
          '创建实例',
          '后端枚举',
          '请求适配器',
          '适配器能力',
          '软件渲染',
          '多适配器',
          '失败处理',
          '实例的寿命',
        ],
      },
      {
        id: 'c19',
        title: '设备与队列',
        subtitle: '真正干活的对象',
        goal: '建立逻辑设备与队列，并知道它们的边界。',
        lessons: [
          '逻辑设备',
          '队列家族',
          '限制与特性',
          '设备丢失',
          '调试层',
          '显存预算',
          '设备与线程',
          '重建设备',
          '设备封装',
        ],
      },
      {
        id: 'c20',
        title: '交换链',
        subtitle: '帧从哪里上屏',
        goal: '把渲染结果稳定地送到显示器，处理每一种失败。',
        viz: ['frameGraph'],
        lessons: [
          '什么是交换链',
          '呈现表面',
          '格式选择',
          '色彩空间',
          '呈现模式',
          '帧数',
          '重建',
          '尺寸为零',
          '首帧',
          '垂直同步',
          '交换链验收',
        ],
      },
      {
        id: 'c21',
        title: '第一帧',
        subtitle: '命令、通道、提交、上屏',
        goal: '画出一整屏颜色，并理解这一帧经过了哪些手。',
        lessons: [
          '命令编码器',
          '渲染通道',
          '清除色',
          '提交',
          '上屏',
          '帧的生命周期',
          '呈现表面状态机',
          '一帧的最小代价',
          '颜色从哪来',
          '第一帧清单',
        ],
      },
      {
        id: 'c22',
        title: '缓冲区与顶点',
        subtitle: '把三角形塞进显存',
        goal: '第一个真正的几何体出现在屏幕上。',
        lessons: [
          '显卡内存模型',
          '顶点是什么',
          '创建缓冲区',
          '写入数据',
          '对齐',
          '索引缓冲',
          '暂存缓冲',
          '环形缓冲',
          '缓冲区封装',
          '画一个三角形',
          '顶点布局',
        ],
      },
      {
        id: 'c23',
        title: '着色器',
        subtitle: '着色语言、绑定与热重载',
        goal: '让 GPU 上的代码可读、可改、可调试。',
        lessons: [
          '着色器在管线中的位置',
          '着色语言语法',
          '顶点入口',
          '片元入口',
          '内建变量',
          '统一变量',
          '纹理与采样器',
          '绑定组',
          '编译与反射',
          '两种着色语言',
          '热重载着色器',
          '着色器调试',
        ],
      },
      {
        id: 'c24',
        title: '管线',
        subtitle: '把状态固化成对象',
        goal: '一条完整管线：从顶点到像素。',
        lessons: [
          '管线状态对象',
          '顶点阶段',
          '图元装配',
          '光栅化',
          '深度测试',
          '混合',
          '多重采样',
          '管线缓存',
          '管线变体',
          '第一个立方体',
          '管线验收',
        ],
      },
      {
        id: 'c25',
        title: '摄像机',
        subtitle: '矩阵、空间与鼠标视角',
        goal: '能在场景里自由移动，且画面不歪。',
        lessons: [
          '坐标系',
          '向量与矩阵',
          '模型矩阵',
          '视图矩阵',
          '投影矩阵',
          '透视与正交',
          '视锥',
          '鼠标视角',
          '移动',
          '相机验收',
        ],
      },
      {
        id: 'c26',
        title: '深度与裁剪',
        subtitle: '谁在前面',
        goal: '让遮挡关系正确，且不出现 Z 冲突。',
        lessons: [
          '深度缓冲',
          '深度格式',
          '深度范围',
          '面剔除',
          '深度冲突',
          '反向深度',
          '裁剪空间',
          '视口',
          '深度验收',
        ],
      },
      {
        id: 'c27',
        title: '纹理',
        subtitle: '从图片到像素',
        goal: '贴上一张图，并理解采样、过滤与 sRGB。',
        lessons: [
          '纹素与像素',
          '上传纹理',
          '采样器',
          '过滤',
          '多级纹理',
          '环绕模式',
          '标准色域',
          '纹理数组',
          '压缩纹理',
          '图集',
          '绑定到着色器',
          '纹理验收',
        ],
      },
      {
        id: 'c28',
        title: '材质与光照',
        subtitle: '从平面到实体',
        goal: '一套可调的 PBR 材质，光照看起来对。',
        lessons: [
          '材质是什么',
          '法线',
          '漫反射',
          '镜面',
          '真实感渲染参数',
          '金属度与粗糙度',
          '环境光',
          '色调映射',
          '伽马',
          '材质实例',
          '材质排序',
          '材质验收',
        ],
      },
      {
        id: 'c29',
        title: '调试渲染',
        subtitle: '验证层与捕获一帧',
        goal: 'GPU 不给你堆栈，但你可以自己留证据。',
        lessons: [
          '验证层',
          '标签与名字',
          '捕获一帧',
          '管线错误',
          '着色器错误',
          '内存泄漏',
          '显卡崩溃',
          '调试清单',
        ],
      },
    ],
  },
  {
    name: '第四部 · 渲染架构',
    note: '能画一个东西之后，开始考虑一百个东西怎么画。',
    chapters: [
      {
        id: 'c30',
        title: '帧图',
        subtitle: '帧图的动机与实现',
        goal: '让通道自己声明依赖，顺序由机器算。',
        viz: ['renderGraph'],
        lessons: [
          '为什么需要帧图',
          '通道节点',
          '资源声明',
          '依赖与拓扑排序',
          '帧图构建器',
          '执行',
          '临时资源',
          '别名与复用',
          '帧图调试',
          '第一个后处理',
          '帧图验收',
          '帧图的边界',
        ],
      },
      {
        id: 'c31',
        title: '资源与句柄',
        subtitle: '代际、内存区与延迟销毁',
        goal: '资源不再是一个 Box，而是一个可失效的编号。',
        lessons: [
          '资源不是对象',
          '句柄与代际',
          '资源表',
          '内存区',
          '生命周期',
          '延迟销毁',
          '引用计数',
          '资源泄漏',
          '热重载资源',
          '资源调试',
          '句柄验收',
        ],
      },
      {
        id: 'c32',
        title: '同步',
        subtitle: '屏障、布局与队列转移',
        goal: '让 GPU 的并行真正跑起来，而不是靠猜。',
        lessons: [
          '显卡的并行',
          '布局转换',
          '屏障',
          '读写依赖',
          '通道内外',
          '自动屏障',
          '过度同步',
          '队列家族转移',
          '屏障调试',
          '屏障验收',
          '常见错误',
        ],
      },
      {
        id: 'c33',
        title: '阴影',
        subtitle: '阴影贴图与级联',
        goal: '一张能看的阴影，且不闪、不漏、不太慢。',
        lessons: [
          '阴影的原理',
          '光源空间',
          '阴影贴图',
          '级联',
          '偏移与粉刺',
          '软阴影',
          '点光阴影',
          '阴影调试',
          '阴影性能',
          '阴影验收',
          '阴影的边界',
        ],
      },
      {
        id: 'c34',
        title: '后处理',
        subtitle: '离屏、全屏三角形与效果链',
        goal: '在最终图像上加一层可控的加工。',
        lessons: [
          '后处理的位置',
          '全屏三角形',
          '离屏渲染',
          '色调映射',
          '泛光',
          '景深',
          '抗锯齿',
          '环境遮蔽',
          '后处理链',
          '分辨率',
          '后处理调试',
          '后处理验收',
        ],
      },
      {
        id: 'c35',
        title: '合批与剔除',
        subtitle: '绘制调用的账要算清楚',
        goal: '一千个物体，仍然只有几十次绘制。',
        lessons: [
          '绘制调用的成本',
          '实例化',
          '间接绘制',
          '合批策略',
          '材质排序',
          '透明排序',
          '剔除',
          '细节层次',
          '合批验收',
          '何时不该合批',
        ],
      },
      {
        id: 'c36',
        title: '显卡数据流',
        subtitle: '缓冲、推送常量与帧内分配',
        goal: '数据以正确的形状、在正确的时刻到达 GPU。',
        lessons: [
          '数据在哪',
          '只读缓冲',
          '存储缓冲',
          '推送常量',
          '上传节奏',
          '帧内分配',
          '数据布局',
          '与实体组件系统对接',
          '数据验收',
          '数据流图',
        ],
      },
      {
        id: 'c37',
        title: '性能',
        subtitle: '帧预算、剖析与回归',
        goal: '知道慢在哪，并且能证明它变快了。',
        lessons: [
          '帧预算',
          '处理器与显卡计时',
          '管线停顿',
          '过度绘制',
          '带宽',
          '占用率',
          '剖析工具',
          '性能回归',
          '性能报告',
          '性能验收',
        ],
      },
    ],
  },
  {
    name: '第五部 · 世界',
    note: '渲染器只是眼睛。现在给它一个世界。',
    chapters: [
      {
        id: 'c38',
        title: '实体组件系统基础',
        subtitle: '实体、组件与存储',
        goal: '用组合而不是继承来描述世界。',
        viz: ['ecs'],
        lessons: [
          '为什么用实体组件系统',
          '实体',
          '组件',
          '稀疏集',
          '原型',
          '世界',
          '生成与销毁',
          '代际',
          '组件注册',
          '第一个系统',
          '实体组件系统验收',
          '实体组件系统的边界',
        ],
      },
      {
        id: 'c39',
        title: '查询与调度',
        subtitle: '借用、阶段与并行',
        goal: '让系统可以并行跑，且编译器帮你看住数据。',
        lessons: [
          '查询',
          '单组件',
          '双组件',
          '可选组件',
          '可变查询',
          '借用检查',
          '系统',
          '阶段',
          '并行调度',
          '访问冲突',
          '调度器验收',
          '调度器调试',
        ],
      },
      {
        id: 'c40',
        title: '场景',
        subtitle: '层级、预制体与实例化',
        goal: '把一个世界存下来，再原样加载回来。',
        lessons: [
          '场景是什么',
          '实体层级',
          '父子变换',
          '局部与世界',
          '场景加载',
          '场景实例化',
          '预制体',
          '场景切换',
          '场景序列化',
          '场景调试',
          '场景验收',
        ],
      },
      {
        id: 'c41',
        title: '变换',
        subtitle: '平移、旋转与四元数',
        goal: '空间数学不再靠抄代码。',
        lessons: [
          '空间的层级',
          '平移',
          '旋转',
          '四元数',
          '缩放',
          '矩阵合成',
          '法线变换',
          '万向节',
          '插值',
          '变换验收',
        ],
      },
      {
        id: 'c42',
        title: '资源管线',
        subtitle: '源资源、烘焙与资源包',
        goal: '运行时只读结果，不解析源文件。',
        viz: ['assetPipeline'],
        lessons: [
          '运行时不该解析',
          '源资源',
          '中间格式',
          '烘焙',
          '依赖图',
          '增量烘焙',
          '资源包',
          '版本',
          '校验',
          '热加载',
          '资源验收',
          '管线的边界',
        ],
      },
      {
        id: 'c43',
        title: '序列化',
        subtitle: '反射、版本与迁移',
        goal: '存档在两年后还能读。',
        lessons: [
          '数据与代码',
          '反射',
          '字段标签',
          '版本迁移',
          '二进制格式',
          '文本格式',
          '引用与句柄',
          '校验和',
          '序列化验收',
          '兼容性策略',
        ],
      },
      {
        id: 'c44',
        title: '动画',
        subtitle: '关键帧、骨骼与状态机',
        goal: '让角色动起来，且动画之间能过渡。',
        lessons: [
          '动画的最小数据',
          '关键帧',
          '插值',
          '曲线',
          '骨骼',
          '蒙皮',
          '动画状态机',
          '混合',
          '根运动',
          '动画验收',
        ],
      },
      {
        id: 'c45',
        title: '物理',
        subtitle: '碰撞、接触与固定步长',
        goal: '一个能站住、能推箱子的最小物理。',
        lessons: [
          '碰撞的形状',
          '包围盒',
          '宽相',
          '窄相',
          '接触',
          '冲量',
          '约束',
          '固定步长',
          '物理与渲染',
          '物理调试',
          '物理验收',
        ],
      },
    ],
  },
  {
    name: '第六部 · 外壳',
    note: '引擎之外的引擎：编辑器、热重载、平台与发布。',
    chapters: [
      {
        id: 'c46',
        title: '编辑器',
        subtitle: '另一个程序，同一份数据',
        goal: '做一个能改场景、能撤销、能保存的编辑器。',
        viz: ['editor'],
        lessons: [
          '编辑器是另一个程序',
          '进程边界',
          '协议',
          '命令',
          '撤销',
          '场景视图',
          '属性面板',
          '拾取',
          '操纵器',
          '保存与冲突',
          '编辑器验收',
          '编辑器的边界',
        ],
      },
      {
        id: 'c47',
        title: '热重载',
        subtitle: '改一行，不用重启',
        goal: '在保住运行状态的前提下替换代码与资源。',
        lessons: [
          '热重载的价值',
          '监视文件',
          '重建',
          '状态保留',
          '着色器热重载',
          '资源热重载',
          '失败的恢复',
          '热重载验收',
          '热重载的边界',
        ],
      },
      {
        id: 'c48',
        title: '平台',
        subtitle: '桌面、移动与后台',
        goal: '同一套代码，活在不同的操作系统上。',
        lessons: [
          '平台矩阵',
          '窗口后端',
          '移动端',
          '后台与恢复',
          '触摸',
          '生命周期差异',
          '打包格式',
          '权限',
          '平台验收',
          '平台抽象',
        ],
      },
      {
        id: 'c49',
        title: '发布',
        subtitle: '构建、签名与更新',
        goal: '把一个能双击运行的版本交到玩家手里。',
        lessons: [
          '构建配置',
          '资源打包',
          '签名',
          '安装包',
          '自动更新',
          '崩溃上传',
          '版本号',
          '发布清单',
          '回滚',
          '发布验收',
        ],
      },
      {
        id: 'c50',
        title: '遥测',
        subtitle: '你要不要知道玩家的机器',
        goal: '在不作恶的前提下，拿到改进引擎需要的信息。',
        lessons: [
          '要不要遥测',
          '最小化',
          '匿名',
          '同意',
          '崩溃报告',
          '性能采样',
          '服务端',
          '遥测验收',
        ],
      },
      {
        id: 'c51',
        title: '协作',
        subtitle: '边界、提交与文档',
        goal: '让第二个人能接手的工程习惯。',
        lessons: [
          '代码边界',
          '提交粒度',
          '代码评审',
          '文档',
          '例子',
          '分支与发布',
          '依赖升级',
          '协作验收',
        ],
      },
    ],
  },
  {
    name: '第七部 · 收束',
    note: '把散落的东西重新拼成一张图。',
    chapters: [
      {
        id: 'c52',
        title: '回顾：引擎的形状',
        subtitle: '数据流、线程、生命周期',
        goal: '能在一张纸上画出你自己的引擎。',
        viz: ['architecture'],
        lessons: [
          '引擎的形状',
          '数据流',
          '线程模型',
          '资源生命周期',
          '错误模型',
          '性能模型',
          '可测试性',
          '还能更好吗',
        ],
      },
      {
        id: 'c53',
        title: '下一台引擎',
        subtitle: '从教程到产品',
        goal: '知道下一步该写什么，以及不该写什么。',
        lessons: [
          '你学到了什么',
          '你还没学什么',
          '下一台引擎',
          '从教程到产品',
          '社区与资料',
          '结语',
        ],
      },
    ],
  },
];

function derive(lessons: Lesson[]): Status {
  if (lessons.every((l) => l.status === 'ready')) return 'ready';
  if (lessons.every((l) => l.status === 'planned')) return 'planned';
  return 'writing';
}

function build() {
  const chapters: Chapter[] = [];
  const lessons: Lesson[] = [];

  let chapterIndex = 0;
  for (const part of SPEC) {
    for (const spec of part.chapters) {
      chapterIndex += 1;
      const num = String(chapterIndex).padStart(2, '0');

      const own: Lesson[] = spec.lessons.map((entry, i) => {
        const [title, status] = Array.isArray(entry)
          ? entry
          : [entry, 'planned' as Status];
        const index = i + 1;
        const id = `${spec.id}-${String(index).padStart(2, '0')}`;
        return {
          id,
          chapter: spec.id,
          chapterTitle: spec.title,
          part: part.name,
          num: `${num}.${String(index).padStart(2, '0')}`,
          index,
          title,
          status,
          file: `${id}.mdx`,
        };
      });

      lessons.push(...own);
      chapters.push({
        id: spec.id,
        num,
        title: spec.title,
        subtitle: spec.subtitle,
        goal: spec.goal,
        part: part.name,
        viz: spec.viz,
        status: derive(own),
        lessons: own,
      });
    }
  }

  const parts: Part[] = SPEC.map((p) => {
    const own = chapters.filter((c) => c.part === p.name);
    return {
      name: p.name,
      note: p.note,
      chapters: own,
      lessons: own.reduce((n, c) => n + c.lessons.length, 0),
    };
  });

  return { chapters, lessons, parts };
}

export const { chapters: CHAPTERS, lessons: LESSONS, parts: PARTS } = build();

const CHAPTER_BY_ID = new Map(CHAPTERS.map((c) => [c.id, c]));
const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

export function findChapter(id: string): Chapter | undefined {
  return CHAPTER_BY_ID.get(id);
}

export function findLesson(id: string): Lesson | undefined {
  return LESSON_BY_ID.get(id);
}

export function lessonAt(index: number): Lesson | undefined {
  return LESSONS[index];
}

export function lessonPosition(id: string): number {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i < 0 ? 0 : i;
}

export const TOTAL_LESSONS = LESSONS.length;
export const TOTAL_CHAPTERS = CHAPTERS.length;
