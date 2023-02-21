import React from 'react'
import { observer } from 'mobx-react-lite'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Divider, Input } from 'semantic-ui-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons'

export default observer(() => {
    const navigate = useNavigate()

    const join = async (platform) => {
        console.log('join through', platform)

        // authorization through relay

        // redirect to user page
        return navigate('/user')
    }

    return (
        <div className="join-container">
            <Button basic color="blue" size="huge" onClick={() => join('twitter')}>
                <FontAwesomeIcon icon={faTwitter} />
                <span>Join with Twitter</span>
            </Button>
            <Button basic color="black" size="huge" onClick={() => join('github')}>
                <FontAwesomeIcon icon={faGithub} />
                <span>Join with Github</span>
            </Button>

            <Divider horizontal>Already has account?</Divider>

            <Input placeholder="Please enter your private key." size="large" />
            <Button basic color="white" size="large">Log in</Button>

            <Link to="/help">Any question?</Link>
        </div>
    )
})