import React, { useState, useContext } from 'react'
import { observer } from 'mobx-react-lite'
import { Container, Button, Image, Grid, Segment, Message } from 'semantic-ui-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons'

import User from '../contexts/User'

export default observer(() => {
    const [isIdentityRevealed, setIdentityRevealed] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const user = useContext(User)

    const copyIdentity = () => {
        navigator.clipboard.writeText(user.id)
        setIsCopied(true)
    }

    return (
        <>
        {
            user.hasSignedUp ?
            <>
            <Container fluid className="user-header">
            <Grid>
                <Grid.Row columns={2}>
                    <Grid.Column width={3}>
                        <Image src={require('../../public/user.jpg')} size="small" circular/>
                    </Grid.Column>
                    <Grid.Column width={7}>
                        <Container className="info-container">
                            <span><b>My Identity:</b></span>
                            {
                                isIdentityRevealed ? 
                                    <div className="identity-container">
                                        <span>{user.id}</span>
                                        <Button color="grey" inverted basic onClick={copyIdentity}>{isCopied? 'Copied!' : 'Copy'}</Button>
                                        <Button color="grey" inverted basic onClick={() => setIdentityRevealed(false)}>Hide</Button>
                                    </div> : 
                                    <Button color="grey" inverted basic onClick={() => setIdentityRevealed(true)}>Reveal</Button>
                            }
                        </Container>
                        <Container className="info-container">
                            <span><b>My Badges:</b></span>    
                            <Image src={require('../../public/badge.png')} size="mini" circular inline/>
                        </Container>
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        </Container>
        <Container fluid className="user-body">
            <Segment color="blue">
                <Grid>
                    <Grid.Row stretched>
                        <Grid.Column width={1}>
                            <FontAwesomeIcon icon={faTwitter} />
                        </Grid.Column>
                        <Grid.Column width={4}>
                            <h3>Twitter</h3>
                            <p className="connected">connected</p>
                        </Grid.Column>
                        <Grid.Column width={7} verticalAlign="middle">
                            <p>Rank <i>2</i> with rep <i>80</i>(85)</p>
                        </Grid.Column>
                        <Grid.Column width={2}>
                            <Button>Update</Button>
                        </Grid.Column>
                        <Grid.Column width={2}>
                            <Button>UST</Button>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </Segment>
            <Segment color="yellow">
                <Grid>
                    <Grid.Row stretched>
                        <Grid.Column width={1}>
                            <FontAwesomeIcon icon={faGithub} />
                        </Grid.Column>
                        <Grid.Column width={4}>
                            <h3>Github Stars</h3>
                            <p className="unconnected">unconnected</p>
                        </Grid.Column>
                        <Grid.Column width={9} verticalAlign="middle">
                            Not connected
                        </Grid.Column>
                        <Grid.Column width={2}>
                            <Button>Connect</Button>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </Segment>
            <Segment color="red">
                <Grid>
                    <Grid.Row stretched>
                        <Grid.Column width={1}>
                            <FontAwesomeIcon icon={faGithub} />
                        </Grid.Column>
                        <Grid.Column width={4}>
                            <h3>Github Followers</h3>
                            <p className="unconnected">unconnected</p>
                        </Grid.Column>
                        <Grid.Column width={9} verticalAlign="middle">
                            Not connected
                        </Grid.Column>
                        <Grid.Column width={2}>
                            <Button>Connect</Button>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </Segment>
        </Container> </>: <Message warning header="Please Sign Up" content="Click the Join Button on the header, then you will be able to view your data." />
        }
            
        </>
    )
})