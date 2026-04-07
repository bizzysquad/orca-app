import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { BillBoss } from './pages/BillBoss';
import { SmartStack } from './pages/SmartStack';
import { StackCircle } from './pages/StackCircle';
import { TaskList } from './pages/TaskList';
import { Settings } from './pages/Settings';
import { AdminPanel } from './pages/AdminPanel';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'smart-stack', Component: SmartStack },
      { path: 'bill-boss', Component: BillBoss },
      { path: 'stack-circle', Component: StackCircle },
      { path: 'task-list', Component: TaskList },
      { path: 'settings', Component: Settings },
      { path: 'admin', Component: AdminPanel },
    ],
  },
]);
