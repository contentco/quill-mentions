# Quill Mentions

Custom module for [Quill.js](https://github.com/quilljs/quill) to allow mentions.

## Usage

### Getting Started

To use mentions, initiate a quill editor and add the ```mentions``` when defining your quill ```modules```. 

```javascript
var users = [{
        label: 'Aron',
        username: 'Aron Hunt'
    },
    {
        label: 'Bob',
        username: 'Bobby Johnson'
    },
    {
        label: 'Dennis',
        username: 'Dennis'
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
