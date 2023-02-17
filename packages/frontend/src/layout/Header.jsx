import React from 'react'
import { Link } from 'react-router-dom'

import { Header, Button, Segment } from 'semantic-ui-react'

export default () => {
    return (
        <Segment clearing raised>
            <Header floated="right"> 
                <Button color="orange" size="large">Join</Button>
            </Header>
            <Link to="/"><Header as="h2" icon="certificate" content="My Badge" floated="left" /></Link>
        </Segment>
    )
}
