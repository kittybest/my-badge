import React from 'react'
import { observer } from 'mobx-react-lite'
import { Link } from 'react-router-dom' 

import { Button, Container, Segment, Card } from 'semantic-ui-react'

export default observer(() => {

    const repData = {
        twitter: ['elon musk', 'donald trump', 'kittybest'],
        github_stars: ['jchance', 'vivi432', 'madia'],
        github_followers: ['chiali', 'doggy', 'yuriko']
    }

    const formCardGroup = (data) => {
        return (
            <Card.Group style={{marginTop: '24px'}}>
                {
                    data.map(name =>  <Card fluid header={name} />)
                }
            </Card.Group>
        )
    }

    return (
        <>
            <div className="banner" style={{backgroundImage: `url(${require("../../public/banner.jpg")})`}}>
                <Link to="/join">
                    <Button className="join-button" color="orange" size="massive">Join Us!</Button>
                </Link>
            </div>
            <Container>
                <Segment.Group horizontal>
                    <Segment color="blue">
                        <Button basic color="blue" fluid size="big">Twitter Followers</Button>
                        { formCardGroup(repData.twitter) }
                    </Segment>
                    <Segment color="yellow">
                        <Button basic color="yellow" fluid size="big">Github Stars</Button>
                        { formCardGroup(repData.github_stars) }
                    </Segment>
                    <Segment color="red">
                        <Button basic color="red" fluid size="big">Github Followers</Button>
                        { formCardGroup(repData.github_followers) }
                    </Segment>
                </Segment.Group>
                <div className="margin"></div>
            </Container>
        </>
    ) 
});
