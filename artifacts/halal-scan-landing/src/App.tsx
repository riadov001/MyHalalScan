import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Home from './pages/Home';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Switch>
          <Route path="/" component={Home} />
          <Route>
            <div className="flex h-screen items-center justify-center bg-[#060D09] text-[#EEF4F0] font-sans">
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-[#C8963C]">404</h1>
                <p className="text-[#9AB5A5]">Page non trouvée</p>
                <a href="/" className="inline-block mt-4 text-[#DFB870] hover:underline">Retour à l'accueil</a>
              </div>
            </div>
          </Route>
        </Switch>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
