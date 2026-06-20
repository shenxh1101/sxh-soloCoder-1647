import { Typography, Card, Space } from 'antd'

const { Title, Paragraph } = Typography

function Home() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Title level={2}>欢迎使用 React + TypeScript + Vite 项目模板</Title>
        <Paragraph>
          这是一个集成了 React 18、TypeScript、Vite 5、Ant Design 5、React Router 6、
          Zustand、Axios、ECharts 5 等技术栈的前端项目模板。
        </Paragraph>
      </Card>
      <Card title="技术栈">
        <ul>
          <li>React 18 + TypeScript</li>
          <li>Vite 5</li>
          <li>Ant Design 5</li>
          <li>React Router 6</li>
          <li>Zustand (状态管理)</li>
          <li>Axios (HTTP请求)</li>
          <li>ECharts 5 + echarts-for-react (数据可视化)</li>
          <li>@ant-design/icons (图标)</li>
          <li>dayjs (日期处理)</li>
        </ul>
      </Card>
    </Space>
  )
}

export default Home
