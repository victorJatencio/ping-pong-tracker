import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { Container, Row, Col, Button } from 'react-bootstrap'
import './App.css'


import DashboardPage from './pages/Dashboard'
import HistoryPage from './pages/History'
import LeaderBoard from './pages/Leaderboard'
import MatchDetail from './pages/MatchDetail'
import Profile from './pages/Profile'


function App() {

  return (
    <Container>
      <Row className='my-4'>
        <Col>
          <DashboardPage></DashboardPage>
          <HistoryPage></HistoryPage>
          <LeaderBoard></LeaderBoard>
          <MatchDetail></MatchDetail>
          <Profile></Profile>
        </Col>
      </Row>
    </Container>
  )
}

export default App
