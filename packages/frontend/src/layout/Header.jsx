import React from 'react'
import { Link, useLocation } from 'react-router-dom'

import { Header, Button, Segment } from 'semantic-ui-react'

export default () => {
    const location = useLocation() 

    return (
        <Segment clearing raised>
            <Header floated="right"> 
                {
                    location.pathname !== '/join' && 
                        <Link to="/join">
                            <Button color="orange" size="large">Join</Button>
                        </Link>
                }
            </Header>
            <Link to="/"><Header as="h2" icon="certificate" content="My Badge" floated="left" /></Link>
        </Segment>
    )
}
