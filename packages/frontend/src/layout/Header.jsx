import React from "react"

import { Header, Button, Segment } from 'semantic-ui-react'

export default () => {
    return (
        <Segment clearing raised>
            <Header floated="right"> 
                <Button color="orange" size="large">Join</Button>
            </Header>
            <Header as="h2" icon="certificate" content="My Badge" floated="left" />
        </Segment>
    )
}
