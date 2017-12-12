# Quill Mentions

Custom module for [Quill.js](https://github.com/quilljs/quill) to allow mentions.

## Usage

### Getting Started

To use mentions, initiate a quill editor and add the ```mentions``` when defining your quill ```modules```. 

```javascript
var users = [{
        id: 11,
        fullName: 'Aron Hunt',
        username: 'aronhunt'
    },
    {
        label: 23,
        fullName: 'Bobby Johnson',
        username: 'bobbyjohnson'
    },
    {
        label: 58,
        fullName: 'Dennis',
        username: 'dennis'
    }
]


var quill = new Quill('#quill-editor', {
        modules:{
            mentions: {
                users: users
            }
          },
          theme: 'snow'
});
```
