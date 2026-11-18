import { currentProfile, multiuserConfigured } from '../lib/multiuser';
import WorkoutApp from '../components/WorkoutApp';
import Login from '../components/Login';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!multiuserConfigured()) {
    return <main className="login-page"><div className="login-card"><div className="logo-word">ritmo<span>.</span></div><h1>Ambiente em preparação</h1><p>Esta versão de teste ainda não está habilitada. O aplicativo pessoal continua disponível na versão principal.</p></div></main>;
  }
  const profile = await currentProfile();
  if (!profile) return <Login/>;
  return <WorkoutApp mode="cloud"/>;
}
