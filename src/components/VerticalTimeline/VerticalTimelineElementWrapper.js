import styled from 'styled-components'; 

const VerticalTimelineElementWrapper = styled.div`
    .vertical-timeline-element {
        position: relative;
        margin: 2em 0;
    }
    .vertical-timeline-element:after {
        content: "";
        display: table;
        clear: both;
    }
    .vertical-timeline-element:first-child {
        margin-top: 0;
    }
    .vertical-timeline-element:last-child {
        margin-bottom: 0;
    }
    @media only screen and (min-width: 1170px) {
    .vertical-timeline-element {
        margin: 4em 0;
    }
    .vertical-timeline-element:first-child {
        margin-top: 0;
    }
    .vertical-timeline-element:last-child {
        margin-bottom: 0;
    }
    }

    .vertical-timeline-element-icon {
        position: absolute;
        top: 0;
        left: 0;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        box-shadow: 0 0 0 4px white, inset 0 2px 0 rgba(0, 0, 0, 0.08), 0 3px 0 4px rgba(0, 0, 0, 0.05);
    }
    .vertical-timeline-element-icon svg {
        display: block;
        width: 24px;
        height: 24px;
        position: relative;
        left: 50%;
        top: 50%;
        margin-left: -12px;
        margin-top: -12px;
    }

    @media only screen and (min-width: 1170px) {
        .vertical-timeline-element-icon {
            width: 60px;
            height: 60px;
            left: 50%;
            margin-left: -30px;
            /* Force Hardware Acceleration in WebKit */
            -webkit-transform: translateZ(0);
            -webkit-backface-visibility: hidden;
        }
        .vertical-timeline-element-icon.is-hidden {
            visibility: hidden;
        }
        .vertical-timeline-element-icon.bounce-in {
            visibility: visible;
            -webkit-animation: cd-bounce-1 0.6s;
            -moz-animation: cd-bounce-1 0.6s;
            animation: cd-bounce-1 0.6s;
        }
    }

    @-webkit-keyframes cd-bounce-1 {
    0% {
        opacity: 0;
        -webkit-transform: scale(0.5);
    }

    60% {
        opacity: 1;
        -webkit-transform: scale(1.2);
    }

    100% {
        -webkit-transform: scale(1);
    }
    }
    @-moz-keyframes cd-bounce-1 {
    0% {
        opacity: 0;
        -moz-transform: scale(0.5);
    }

    60% {
        opacity: 1;
        -moz-transform: scale(1.2);
    }

    100% {
        -moz-transform: scale(1);
    }
    }
    @keyframes cd-bounce-1 {
    0% {
        opacity: 0;
        -webkit-transform: scale(0.5);
        -moz-transform: scale(0.5);
        -ms-transform: scale(0.5);
        -o-transform: scale(0.5);
        transform: scale(0.5);
    }

    60% {
        opacity: 1;
        -webkit-transform: scale(1.2);
        -moz-transform: scale(1.2);
        -ms-transform: scale(1.2);
        -o-transform: scale(1.2);
        transform: scale(1.2);
    }

    100% {
        -webkit-transform: scale(1);
        -moz-transform: scale(1);
        -ms-transform: scale(1);
        -o-transform: scale(1);
        transform: scale(1);
    }
    }
    .vertical-timeline-element-content {
    position: relative;
    margin-left: 60px;
    background: white;
    border-radius: 0.25em;
    padding: 1em;
    box-shadow: 0 3px 0 #ddd;
    }
    .vertical-timeline-element-content:after {
    content: "";
    display: table;
    clear: both;
    }
    .vertical-timeline-element-content h2 {
    color: #303e49;
    }
    .vertical-timeline-element-content p, .vertical-timeline-element-content .vertical-timeline-element-date {
    font-size: 13px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #333;
    }
    .vertical-timeline-element-content .vertical-timeline-element-date {
    display: inline-block;
    }
    .vertical-timeline-element-content p {
    margin: 1em 0 0;
    line-height: 1.6;
    }

    .vertical-timeline-element-title {
    margin: 0;
    }

    .vertical-timeline-element-subtitle {
    margin: 0;
    }

    .vertical-timeline-element-content .vertical-timeline-element-date {
    float: left;
    padding: .8em 0;
    opacity: .7;
    }
    .vertical-timeline-element-content::before {
    content: '';
    position: absolute;
    top: 16px;
    right: 100%;
    height: 0;
    width: 0;
    border: 7px solid transparent;
    border-right: 7px solid white;
    }
    @media only screen and (min-width: 768px) {
    .vertical-timeline-element-content h2 {
        font-size: 20px;
        font-size: 1.25rem;
    }
    .vertical-timeline-element-content p {
        font-size: 16px;
        font-size: 1rem;
    }
    .vertical-timeline-element-content .vertical-timeline-element-date {
        font-size: 14px;
        font-size: 0.875rem;
    }
    }
    @media only screen and (min-width: 1170px) {
    .vertical-timeline-element-content {
        margin-left: 0;
        padding: 1.5em;
        width: 40%;
    }
    .vertical-timeline-element-content::before {
        top: 24px;
        left: 100%;
        border-color: transparent;
        border-left-color: white;
    }

    .vertical-timeline-element-content .vertical-timeline-element-date {
        position: absolute;
        width: 100%;
        left: 124%;
        top: 6px;
        font-size: 16px;
        font-size: 1rem;
    }

    .vertical-timeline-element:nth-child(even):not(.vertical-timeline-element--left) .vertical-timeline-element-content,
    .vertical-timeline-element.vertical-timeline-element--right .vertical-timeline-element-content {
        float: right;
    }
    .vertical-timeline-element:nth-child(even):not(.vertical-timeline-element--left) .vertical-timeline-element-content::before,
    .vertical-timeline-element.vertical-timeline-element--right .vertical-timeline-element-content::before {
        top: 24px;
        left: auto;
        right: 100%;
        border-color: transparent;
        border-right-color: white;
    }

    .vertical-timeline-element:nth-child(even):not(.vertical-timeline-element--left) .vertical-timeline-element-content .vertical-timeline-element-date,
    .vertical-timeline-element.vertical-timeline-element--right .vertical-timeline-element-content .vertical-timeline-element-date {
        left: auto;
        right: 124%;
        text-align: right;
    }
    .vertical-timeline-element-content.is-hidden {
        visibility: hidden;
    }
    .vertical-timeline-element-content.bounce-in {
        visibility: visible;
        -webkit-animation: cd-bounce-2 0.6s;
        -moz-animation: cd-bounce-2 0.6s;
        animation: cd-bounce-2 0.6s;
    }
    }

    @media only screen and (min-width: 1170px) {
    /* inverse bounce effect on even content blocks */
    .vertical-timeline-element:nth-child(even):not(.vertical-timeline-element--left) .vertical-timeline-element-content.bounce-in,
    .vertical-timeline-element.vertical-timeline-element--right .vertical-timeline-element-content.bounce-in {
        -webkit-animation: cd-bounce-2-inverse 0.6s;
        -moz-animation: cd-bounce-2-inverse 0.6s;
        animation: cd-bounce-2-inverse 0.6s;
    }
    }
    @-webkit-keyframes cd-bounce-2 {
    0% {
        opacity: 0;
        -webkit-transform: translateX(-100px);
    }

    60% {
        opacity: 1;
        -webkit-transform: translateX(20px);
    }

    100% {
        -webkit-transform: translateX(0);
    }
    }
    @-moz-keyframes cd-bounce-2 {
    0% {
        opacity: 0;
        -moz-transform: translateX(-100px);
    }

    60% {
        opacity: 1;
        -moz-transform: translateX(20px);
    }

    100% {
        -moz-transform: translateX(0);
    }
    }
    @keyframes cd-bounce-2 {
    0% {
        opacity: 0;
        -webkit-transform: translateX(-100px);
        -moz-transform: translateX(-100px);
        -ms-transform: translateX(-100px);
        -o-transform: translateX(-100px);
        transform: translateX(-100px);
    }

    60% {
        opacity: 1;
        -webkit-transform: translateX(20px);
        -moz-transform: translateX(20px);
        -ms-transform: translateX(20px);
        -o-transform: translateX(20px);
        transform: translateX(20px);
    }

    100% {
        -webkit-transform: translateX(0);
        -moz-transform: translateX(0);
        -ms-transform: translateX(0);
        -o-transform: translateX(0);
        transform: translateX(0);
    }
    }
    @-webkit-keyframes cd-bounce-2-inverse {
    0% {
        opacity: 0;
        -webkit-transform: translateX(100px);
    }

    60% {
        opacity: 1;
        -webkit-transform: translateX(-20px);
    }

    100% {
        -webkit-transform: translateX(0);
    }
    }
    @-moz-keyframes cd-bounce-2-inverse {
    0% {
        opacity: 0;
        -moz-transform: translateX(100px);
    }

    60% {
        opacity: 1;
        -moz-transform: translateX(-20px);
    }

    100% {
        -moz-transform: translateX(0);
    }
    }
    @keyframes cd-bounce-2-inverse {
    0% {
        opacity: 0;
        -webkit-transform: translateX(100px);
        -moz-transform: translateX(100px);
        -ms-transform: translateX(100px);
        -o-transform: translateX(100px);
        transform: translateX(100px);
    }

    60% {
        opacity: 1;
        -webkit-transform: translateX(-20px);
        -moz-transform: translateX(-20px);
        -ms-transform: translateX(-20px);
        -o-transform: translateX(-20px);
        transform: translateX(-20px);
    }

    100% {
        -webkit-transform: translateX(0);
        -moz-transform: translateX(0);
        -ms-transform: translateX(0);
        -o-transform: translateX(0);
        transform: translateX(0);
    }
    }
`

export default VerticalTimelineElementWrapper;