import { isCloudConfigured, hasSession } from '../lib/server';
import WorkoutApp from '../components/WorkoutApp';
import Login from '../components/Login';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const cloud = isCloudConfigured();
  if (cloud && !await hasSession()) return <Login/>;
  return <WorkoutApp mode={cloud?'cloud':'demo'}/>;
}
