import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button, Divider, Input } from 'semantic-ui-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTwitter, faGithub } from '@fortawesome/free-brands-svg-icons'
import { SERVER } from '../config.js'

export default observer(() => {
    const navigate = useNavigate()
    const location = useLocation()
    const params = new URLSearchParams(location.search)

    useEffect(() => {
        const signupCode = params.get('signupCode')
        const access_token = params.get('access_token')
        const signupError = params.get('signupError')
        if (signupCode && access_token) {
            console.log(signupCode, access_token)

            // redirect to user page
            return navigate('/user')
        } else if (params.get('signupError')) {
            console.error(signupError)
        }
    }, [])

    const join = async (platform) => {
        console.log('join through', platform)

        // authorization through relay
        const currentUrl = new URL(window.location.href)
        const dest = new URL('/join', currentUrl.origin)

        if (platform === 'twitter') {
            const url = new URL('/api/oauth/twitter', SERVER)
            url.searchParams.set('redirectDestination', dest.toString())
            window.location.replace(url.toString())
        } else if (platform === 'github') {
            const url = new URL('/api/oauth/github', SERVER)
            url.searchParams.set('redirectDestination', dest.toString())
            window.location.replace(url.toString())
        } else {
            console.log('wwaitttt whatttt???')
        }
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